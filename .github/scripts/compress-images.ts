import path from "node:path"

import { Glob } from "bun"
import sharp from "sharp"
import { optimize } from "svgo"

// resolve from script location to support being called from any cwd
const scriptDir = path.dirname(Bun.main)
const publicDir = path.resolve(scriptDir, "../../web/next/public")
const isCI = !!process.env.CI
const CONCURRENCY = 8

if (
  !(
    await Bun.file(publicDir)
      .stat()
      .catch(() => null)
  )?.isDirectory()
) {
  console.log("compress-images: public dir not found, skipping")
  process.exit(0)
}

const rasterGlob = new Glob("**/*.{png,jpg,jpeg,webp,avif}")
const svgGlob = new Glob("**/*.svg")

type Result = { file: string; before: number; after: number }
const results: Result[] = []
let total = 0

async function compressRaster(file: string): Promise<Result | null> {
  const filePath = `${publicDir}/${file}`

  try {
    const buffer = Buffer.from(await Bun.file(filePath).arrayBuffer())
    const originalSize = buffer.length
    const ext = file.split(".").pop()?.toLowerCase()

    let output: Buffer

    switch (ext) {
      case "png":
        output = await sharp(buffer).png({ effort: 10, compressionLevel: 9 }).toBuffer()
        break
      case "jpg":
      case "jpeg":
        output = await sharp(buffer).jpeg({ quality: 80, mozjpeg: true }).toBuffer()
        break
      case "webp":
        output = await sharp(buffer).webp({ quality: 80 }).toBuffer()
        break
      case "avif":
        output = await sharp(buffer).avif({ quality: 65 }).toBuffer()
        break
      default:
        return null
    }

    if (output.length < originalSize) {
      await Bun.write(filePath, output)
      return { file, before: originalSize, after: output.length }
    }
  } catch (err) {
    console.warn(`  WARN: failed to compress ${file}: ${err}`)
  }
  return null
}

async function compressSvg(file: string): Promise<Result | null> {
  const filePath = `${publicDir}/${file}`

  try {
    const content = await Bun.file(filePath).text()
    const originalSize = Buffer.byteLength(content)

    const result = optimize(content, {
      plugins: [
        {
          name: "preset-default",
          params: { overrides: { cleanupIds: false } },
        },
      ],
    })
    const optimizedSize = Buffer.byteLength(result.data)

    if (optimizedSize < originalSize) {
      await Bun.write(filePath, result.data)
      return { file, before: originalSize, after: optimizedSize }
    }
  } catch (err) {
    console.warn(`  WARN: failed to optimize ${file}: ${err}`)
  }
  return null
}

// collect all files first
const rasterFiles: string[] = []
const svgFiles: string[] = []

for await (const file of rasterGlob.scan({ cwd: publicDir })) {
  rasterFiles.push(file)
}
for await (const file of svgGlob.scan({ cwd: publicDir })) {
  svgFiles.push(file)
}

total = rasterFiles.length + svgFiles.length

if (!isCI) process.stdout.write(`compressing ${total} images...`)

// process raster images in parallel batches
for (let i = 0; i < rasterFiles.length; i += CONCURRENCY) {
  const batch = rasterFiles.slice(i, i + CONCURRENCY)
  const batchResults = await Promise.all(batch.map(compressRaster))
  for (const r of batchResults) {
    if (r) results.push(r)
  }
}

// process SVGs in parallel batches
for (let i = 0; i < svgFiles.length; i += CONCURRENCY) {
  const batch = svgFiles.slice(i, i + CONCURRENCY)
  const batchResults = await Promise.all(batch.map(compressSvg))
  for (const r of batchResults) {
    if (r) results.push(r)
  }
}

if (!isCI) process.stdout.write("\r")

if (results.length === 0) {
  console.log(`compress-images: ${total} images, all optimal`)
} else {
  const maxName = Math.max(...results.map((r) => r.file.length))
  const maxBefore = Math.max(...results.map((r) => formatSize(r.before).length))
  const maxAfter = Math.max(...results.map((r) => formatSize(r.after).length))

  for (const r of results) {
    const saved = ((1 - r.after / r.before) * 100).toFixed(1)
    console.log(
      `  ${r.file.padEnd(maxName)}  ${formatSize(r.before).padStart(maxBefore)} → ${formatSize(r.after).padStart(maxAfter)}  −${saved}%`,
    )
  }

  const totalBefore = results.reduce((s, r) => s + r.before, 0)
  const totalAfter = results.reduce((s, r) => s + r.after, 0)
  const totalSaved = ((1 - totalAfter / totalBefore) * 100).toFixed(1)
  console.log(
    `\n  compressed ${results.length}/${total} images: ${formatSize(totalBefore)} → ${formatSize(totalAfter)} (−${totalSaved}%)`,
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
