// Captures a full-page screenshot of every page (public + admin) to tests/.screenshots/, a visual baseline for before/after comparison across a rewrite (e.g. Next.js -> TanStack Start). Run `bun run screenshots` for local PNGs, or `bun run screenshots --upload` to also push each to litterbox (72h) and write manifest.md with the URLs (paste that into the PR).
//
// This is a separate command, not part of `bun test`: capturing ~35 pages is slow and the artifacts are only wanted on demand.

import fs from "node:fs"
import path from "node:path"

import { Browser, ensureAgentState } from "@/browser"
import { waitForStack } from "@/http"
import { BLOG_POSTS, DOCS_PAGES } from "@/surface"

const OUT_DIR = path.join(import.meta.dirname, "..", ".screenshots")
const UPLOAD = process.argv.includes("--upload")

// A stable filename for a route: "/docs/getting-started/setup" -> "docs-getting-started-setup", "/" -> "home".
function slug(routePath: string): string {
  return routePath === "/" ? "home" : routePath.slice(1).replace(/\//g, "-")
}

const PUBLIC_ROUTES: string[] = [
  "/",
  "/hire",
  "/resume",
  "/waitlist",
  "/blog",
  ...Object.keys(BLOG_POSTS),
  ...Object.keys(DOCS_PAGES),
]
const ADMIN_ROUTES: string[] = ["/dashboard", "/console", "/console/docs"]

function uploadToLitterbox(file: string): string {
  const proc = Bun.spawnSync([
    "curl",
    "-sS",
    "-F",
    "reqtype=fileupload",
    "-F",
    "time=72h",
    "-F",
    `fileToUpload=@${file}`,
    "https://litterbox.catbox.moe/resources/internals/api.php",
  ])
  const url = proc.stdout.toString().trim()
  if (!url.startsWith("http")) throw new Error(`litterbox upload failed for ${file}: ${url}`)
  return url
}

interface Shot {
  route: string
  file: string
  url?: string
}

async function capture(session: string, routes: string[], state?: string): Promise<Shot[]> {
  const browser = new Browser(session, state)
  const shots: Shot[] = []
  try {
    for (const route of routes) {
      browser.open(route)
      const file = path.join(OUT_DIR, `${slug(route)}.png`)
      browser.screenshot(file)
      shots.push({ route, file })
      console.log(`  captured ${route}`)
    }
  } finally {
    browser.close()
  }
  return shots
}

await waitForStack()
fs.rmSync(OUT_DIR, { recursive: true, force: true })
fs.mkdirSync(OUT_DIR, { recursive: true })

console.log(`Capturing ${PUBLIC_ROUTES.length} public pages...`)
const publicShots = await capture("shot-public", PUBLIC_ROUTES)
console.log(`Capturing ${ADMIN_ROUTES.length} admin pages...`)
const adminShots = await capture("shot-admin", ADMIN_ROUTES, await ensureAgentState())
const shots = [...publicShots, ...adminShots]

if (UPLOAD) {
  console.log("Uploading to litterbox (72h)...")
  for (const shot of shots) {
    shot.url = uploadToLitterbox(shot.file)
    console.log(`  ${shot.route} -> ${shot.url}`)
  }
  const md = [
    "| Page | Screenshot |",
    "| --- | --- |",
    ...shots.map((s) => `| \`${s.route}\` | ${s.url} |`),
  ].join("\n")
  fs.writeFileSync(path.join(OUT_DIR, "manifest.md"), `${md}\n`)
  console.log(`\nManifest written to ${path.join(OUT_DIR, "manifest.md")}`)
} else {
  console.log(
    `\nCaptured ${shots.length} screenshots to ${OUT_DIR} (run with --upload to push to litterbox)`,
  )
}
