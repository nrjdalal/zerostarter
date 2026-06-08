/**
 * Visual-parity layer — the one axis HTTP/SSR assertions can't see: CSS and
 * layout. Screenshots each page at key viewport × theme combos via the
 * agent-browser CLI and pixel-diffs them against a baseline with sharp.
 *
 * It's the port oracle for "looks identical", not just "responds identically":
 *   1. capture golden baselines from the reference (web/next):
 *        bun run test:visual:update
 *   2. diff a target (e.g. a web/start prod build) against them:
 *        BASE_URL=http://localhost:3101 bun run test:visual
 *
 * Baselines are machine-specific (font rendering varies), so they live under
 * test/screenshots/ (gitignored) — regenerate from the reference on the same
 * machine before comparing a port. See the `web-spec` skill.
 */
import { mkdirSync, rmSync } from "node:fs"

import sharp from "sharp"

import { BASE, ensureStack } from "./stack"

// max summed RGB delta (across the 3 channels) before a pixel counts as
// changed, and the max fraction of changed pixels allowed
const CHANNEL_TOLERANCE = 12
const MAX_DIFF_RATIO = 0.01

const dir = `${import.meta.dir}/screenshots`
const baselineDir = `${dir}/baseline`
const currentDir = `${dir}/current`
const diffDir = `${dir}/diff`

const VIEWPORTS = [
  { name: "desktop", w: 1440, h: 900 },
  { name: "mobile", w: 390, h: 844 },
] as const
const THEMES = ["light", "dark"] as const
const PAGES = [
  "/",
  "/hire",
  "/docs",
  "/docs/getting-started/setup",
  "/blog",
  "/blog/web-development-2026",
]

function ab(...args: string[]): void {
  const proc = Bun.spawnSync(["bunx", "agent-browser", ...args], {
    stdout: "ignore",
    stderr: "pipe",
  })
  if (proc.exitCode !== 0) {
    throw new Error(`agent-browser ${args[0]} failed: ${proc.stderr.toString().trim()}`)
  }
}

const slug = (page: string, vp: string, theme: string) =>
  `${page === "/" ? "home" : page.replaceAll("/", "_").replace(/^_/, "")}__${vp}__${theme}`

async function capture(into: string) {
  for (const vp of VIEWPORTS) {
    ab("set", "viewport", String(vp.w), String(vp.h))
    for (const theme of THEMES) {
      for (const page of PAGES) {
        ab("open", `${BASE}${page}`)
        // pin the theme deterministically rather than relying on prefers-color-scheme
        ab("eval", `localStorage.setItem('theme', '${theme}'); location.reload()`)
        ab("wait", "--load", "networkidle")
        await Bun.sleep(600) // settle fonts/animations
        ab("screenshot", "--full", `${into}/${slug(page, vp.name, theme)}.png`)
      }
    }
  }
  // leave the shared daemon at desktop so a following test:e2e isn't stuck
  // behind the mobile sheet (the last loop iteration set 390×844)
  ab("set", "viewport", "1440", "900")
}

// returns the fraction of pixels differing beyond tolerance, and writes a diff
// image (differing pixels in magenta) for review; Infinity if dimensions differ
async function diff(baseline: string, current: string, out: string): Promise<number> {
  const a = await sharp(baseline).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const b = await sharp(current).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  if (a.info.width !== b.info.width || a.info.height !== b.info.height)
    return Number.POSITIVE_INFINITY

  const { width, height } = a.info
  const px = width * height
  const diffBuf = Buffer.from(b.data)
  let changed = 0
  for (let i = 0; i < px; i++) {
    const o = i * 4
    const delta =
      Math.abs(a.data[o] - b.data[o]) +
      Math.abs(a.data[o + 1] - b.data[o + 1]) +
      Math.abs(a.data[o + 2] - b.data[o + 2])
    if (delta > CHANNEL_TOLERANCE) {
      changed++
      diffBuf[o] = 255
      diffBuf[o + 1] = 0
      diffBuf[o + 2] = 255
    }
  }
  if (changed > 0) {
    await sharp(diffBuf, { raw: { width, height, channels: 4 } })
      .png()
      .toFile(out)
  }
  return changed / px
}

// Run the capture + pixel-diff against an ALREADY-UP stack, returning a result
// rather than exiting. This lets the standalone script (below) and test:all
// (test/all.ts) drive the same logic — test:all calls it in-process so the whole
// run shares one ensureStack instead of booting the stack a second time.
export async function visualParity(update: boolean): Promise<{ ok: boolean; summary: string }> {
  if (update) {
    rmSync(baselineDir, { recursive: true, force: true })
    mkdirSync(baselineDir, { recursive: true })
    await capture(baselineDir)
    return { ok: true, summary: `✓ captured baselines from ${BASE} → ${baselineDir}` }
  }

  mkdirSync(currentDir, { recursive: true })
  rmSync(diffDir, { recursive: true, force: true })
  mkdirSync(diffDir, { recursive: true })
  await capture(currentDir)

  const shots = new Bun.Glob("*.png")
  const current = [...shots.scanSync({ cwd: currentDir })]
  // a baseline with no current shot means a page silently dropped out of coverage
  for (const base of shots.scanSync({ cwd: baselineDir })) {
    if (!current.includes(base))
      return { ok: false, summary: `\n✗ baseline ${base} has no current shot — coverage dropped\n` }
  }

  const failures: string[] = []
  let compared = 0
  for (const file of current) {
    const baseline = `${baselineDir}/${file}`
    if (!(await Bun.file(baseline).exists())) {
      return {
        ok: false,
        summary: `\n✗ no baseline for ${file} — run \`bun run test:visual:update\` against the reference first\n`,
      }
    }
    const ratio = await diff(baseline, `${currentDir}/${file}`, `${diffDir}/${file}`)
    compared++
    if (ratio > MAX_DIFF_RATIO) {
      failures.push(
        `${file}: ${(ratio * 100).toFixed(2)}% differ` +
          (ratio === Number.POSITIVE_INFINITY
            ? " (dimensions changed)"
            : ` (> ${MAX_DIFF_RATIO * 100}%) — see ${diffDir}/${file}`),
      )
    }
  }

  if (failures.length > 0) {
    return {
      ok: false,
      summary: `\n✗ visual parity failed on ${failures.length}/${compared} shots:\n  ${failures.join("\n  ")}\n`,
    }
  }
  return {
    ok: true,
    summary: `✓ visual parity: ${compared} shots within ${MAX_DIFF_RATIO * 100}% of baseline`,
  }
}

// Standalone entry (bun run test/visual.ts [--update]): own the stack lifecycle
// the same way run.ts does — auto-start if down, reuse + leave a running one,
// tear down on every exit path (done() on the explicit branches, the catch on
// any throw; ab() throws by design and sharp can throw on a bad PNG, so an
// auto-started stack is never orphaned). The import.meta.main guard keeps this
// from running when test/all.ts imports visualParity.
if (import.meta.main) {
  const update = process.argv.includes("--update")
  const teardown = await ensureStack({ browser: true })
  const done = (code: number, msg: string): never => {
    teardown()
    ;(code ? console.error : console.log)(msg)
    process.exit(code)
  }
  try {
    const result = await visualParity(update)
    done(result.ok ? 0 : 1, result.summary)
  } catch (e) {
    // ab() failures embed stderr in the message, but a sharp internal error is
    // easier to place with the stack — print it before the summary
    if (e instanceof Error && e.stack) console.error(e.stack)
    done(1, `\n✗ visual run errored: ${e instanceof Error ? e.message : String(e)}\n`)
  }
}
