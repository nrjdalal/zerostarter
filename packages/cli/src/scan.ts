import { execFileSync } from "node:child_process"

// Markers that should not survive a conversion. Excludes intentional upstream references.
const MARKERS = ["zerostarter", "nrjdalal", "neeraj", "dalal", "agentzero"]

export interface ScanHit {
  marker: string
  count: number
}

// Brand-scan a converted tree for leftover upstream identity. Uses ripgrep when available.
export const brandScan = (root: string): ScanHit[] => {
  const hits: ScanHit[] = []
  for (const marker of MARKERS) {
    try {
      const out = execFileSync(
        "rg",
        [
          "-i",
          "--count-matches",
          "--no-filename",
          "--glob",
          "!CHANGELOG.md",
          "--glob",
          "!bun.lock",
          "--glob",
          "!.git",
          marker,
          root,
        ],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      )
      const count = out
        .trim()
        .split("\n")
        .filter(Boolean)
        .reduce((sum, line) => sum + Number(line), 0)
      if (count > 0) hits.push({ count, marker })
    } catch {
      // rg exits non-zero when there are no matches: that is a clean result
    }
  }
  return hits
}
