import { brandScan } from "@/scan"

export const doctor = async (_argv: string[]) => {
  const hits = brandScan(process.cwd())
  if (hits.length === 0) {
    console.log("doctor: clean. No leftover upstream branding found.")
    return
  }
  console.log("doctor: leftover upstream markers found:")
  for (const hit of hits) console.log(`  ${hit.marker}: ${hit.count}`)
  process.exitCode = 1
}
