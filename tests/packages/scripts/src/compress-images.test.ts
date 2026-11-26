import { expect, test } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const script = join(import.meta.dir, "../../../../packages/scripts/src/compress-images.ts")
const source = join(import.meta.dir, "../../../../web/next/public/marketing/fumadocs.png")

const compress = (dir: string) =>
  Bun.spawnSync(["bun", script, dir], { env: { ...process.env, CI: "1" } })

test("a PNG that compresses is rewritten smaller at the same size in pixels", async () => {
  const dir = mkdtempSync(join(tmpdir(), "compress-images-"))
  try {
    const raw = await new Bun.Image(await Bun.file(source).arrayBuffer())
      .png({ compressionLevel: 0 })
      .buffer()
    await Bun.write(join(dir, "raw.png"), raw)
    expect(compress(dir).exitCode).toBe(0)
    const out = await Bun.file(join(dir, "raw.png")).arrayBuffer()
    expect(out.byteLength).toBeLessThan(raw.length)
    const before = await new Bun.Image(raw).metadata()
    const after = await new Bun.Image(out).metadata()
    expect({ format: after.format, height: after.height, width: after.width }).toEqual({
      format: "png",
      height: before.height,
      width: before.width,
    })
  } finally {
    rmSync(dir, { force: true, recursive: true })
  }
})

test("a PNG that would grow is left byte for byte", async () => {
  const dir = mkdtempSync(join(tmpdir(), "compress-images-"))
  try {
    const small = new Uint8Array(await Bun.file(source).arrayBuffer())
    await Bun.write(join(dir, "small.png"), small)
    expect(compress(dir).exitCode).toBe(0)
    expect(new Uint8Array(await Bun.file(join(dir, "small.png")).arrayBuffer())).toEqual(small)
  } finally {
    rmSync(dir, { force: true, recursive: true })
  }
})
