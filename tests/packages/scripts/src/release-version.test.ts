import { describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import {
  bump,
  compare,
  decide,
  decideIn,
  readVersion,
  writeVersion,
} from "../../../../packages/scripts/src/release-version"

// The pure decision, then the whole script against throwaway git repositories shaped like each stage of a project: a fresh fork with no tag, a steady-state window, a window that turns breaking halfway, a window of nothing but mechanical commits, a hand-set ahead of everything, a tree already moved forward, and a tree below the last tag. The repositories are real so changelogen's own parsing reads real commits, and one scenario runs changelogen's command beside the script to keep the two agreeing.

describe("compare", () => {
  test("orders numeric semver by major, then minor, then patch", () => {
    expect(compare("0.1.28", "0.1.27")).toBeGreaterThan(0)
    expect(compare("0.2.0", "0.1.99")).toBeGreaterThan(0)
    expect(compare("1.0.0", "0.99.99")).toBeGreaterThan(0)
    expect(compare("0.0.100", "0.0.99")).toBeGreaterThan(0)
    expect(compare("0.1.27", "0.1.27")).toBe(0)
    expect(compare("0.1.27", "0.1.28")).toBeLessThan(0)
  })

  test("refuses anything that is not three numbers", () => {
    expect(() => compare("0.1", "0.1.0")).toThrow("not a release version")
    expect(() => compare("v0.1.0", "0.1.0")).toThrow("not a release version")
  })
})

describe("bump", () => {
  test("moves one step, collapsing major and minor below 1.0 as changelogen does", () => {
    expect(bump("0.1.27", "patch")).toBe("0.1.28")
    expect(bump("0.1.27", "minor")).toBe("0.1.28")
    expect(bump("0.1.27", "major")).toBe("0.2.0")
    expect(bump("0.0.99", "patch")).toBe("0.0.100")
    expect(bump("1.4.2", "patch")).toBe("1.4.3")
    expect(bump("1.4.2", "minor")).toBe("1.5.0")
    expect(bump("1.4.2", "major")).toBe("2.0.0")
  })
})

describe("decide", () => {
  test("moves the tree forward to what the window earned", () => {
    expect(decide("0.1.27", "0.1.28", "v0.1.27")).toEqual({
      current: "0.1.27",
      earned: "0.1.28",
      moved: true,
      next: "0.1.28",
      tag: "v0.1.27",
    })
  })

  test("keeps a hand-set that is ahead of the window", () => {
    expect(decide("2.0.0", "0.1.28", "v0.1.27").next).toBe("2.0.0")
    expect(decide("2.0.0", "0.1.28", "v0.1.27").moved).toBe(false)
  })

  test("lifts a hand-set that undercounts a breaking window", () => {
    expect(decide("0.1.28", "0.2.0", "v0.1.27").next).toBe("0.2.0")
  })

  test("leaves a tree already at the earned number alone", () => {
    expect(decide("0.1.28", "0.1.28", "v0.1.27").moved).toBe(false)
  })

  test("treats a missing tag as v0.0.0, so a fork's first number is honored", () => {
    expect(decide("0.0.0", "0.0.1", null).next).toBe("0.0.1")
    expect(decide("1.0.0", "0.0.1", null).next).toBe("1.0.0")
  })

  test("refuses a tree below the last release", () => {
    expect(() => decide("0.1.26", "0.1.28", "v0.1.27")).toThrow("below the last release v0.1.27")
    expect(() => decide("0.1.27", "0.1.28", "v0.1.28")).toThrow("below the last release v0.1.28")
  })
})

// A throwaway repository with one starter commit at a version and this repo's changelog config, and helpers to add tagged or untagged conventional commits.
const repo = async (version: string): Promise<string> => {
  const dir = mkdtempSync(join(tmpdir(), "release-version-"))
  await Bun.$`git init -q -b canary ${dir}`
  await Bun.$`git -C ${dir} config user.email probe@example.com`
  await Bun.$`git -C ${dir} config user.name probe`
  await Bun.$`git -C ${dir} remote add origin https://github.com/probe/probe.git`
  // The changelog config rides along, as it does in this repo and in a fork: it is what drops ci commits, which the decision reads the way the content gate does.
  await Bun.write(
    join(dir, "changelog.config.json"),
    await Bun.file(join(import.meta.dir, "../../../../changelog.config.json")).text(),
  )
  await Bun.write(
    join(dir, "package.json"),
    `{\n  "name": "probe",\n  "version": "${version}"\n}\n`,
  )
  await Bun.$`git -C ${dir} add package.json changelog.config.json`
  await Bun.$`git -C ${dir} commit -q -m "chore: scaffold"`
  return dir
}

const commit = async (dir: string, message: string, tag?: string): Promise<void> => {
  await Bun.$`git -C ${dir} commit -q --allow-empty -m ${message}`
  if (tag) await Bun.$`git -C ${dir} tag ${tag}`
}

const setVersion = async (dir: string, version: string): Promise<void> => {
  await writeVersion(join(dir, "package.json"), version)
  await Bun.$`git -C ${dir} commit -q -am ${"chore: set version " + version}`
}

const cleanup = (dir: string): void => {
  rmSync(dir, { force: true, recursive: true })
}

const script = join(import.meta.dir, "../../../../packages/scripts/src/release-version.ts")

describe("decideIn, against real repositories", () => {
  test("a fresh fork with no tag earns 0.0.1 from its first fix", async () => {
    const dir = await repo("0.0.0")
    try {
      await commit(dir, "fix: first")
      expect(await decideIn(dir)).toMatchObject({ earned: "0.0.1", next: "0.0.1", tag: null })
    } finally {
      cleanup(dir)
    }
  }, 30000)

  test("a feature window at 0.x earns a patch, and a breaking commit turns it minor", async () => {
    const dir = await repo("0.1.27")
    try {
      await commit(dir, "chore: release", "v0.1.27")
      await commit(dir, "feat: one")
      expect(await decideIn(dir)).toMatchObject({ earned: "0.1.28", moved: true, next: "0.1.28" })
      await commit(dir, "feat!: two")
      expect(await decideIn(dir)).toMatchObject({ earned: "0.2.0", next: "0.2.0" })
    } finally {
      cleanup(dir)
    }
  }, 30000)

  test("a window of nothing but mechanical commits earns nothing", async () => {
    const dir = await repo("0.1.27")
    try {
      await commit(dir, "chore: release", "v0.1.27")
      await commit(dir, "ci(changelog): update changelog and bump version")
      await commit(dir, "ci(version): bump to v0.1.28")
      expect(await decideIn(dir)).toMatchObject({
        earned: "0.1.27",
        moved: false,
        next: "0.1.27",
      })
    } finally {
      cleanup(dir)
    }
  }, 30000)

  test("a window of one non-conventional commit earns nothing", async () => {
    const dir = await repo("0.1.27")
    try {
      await commit(dir, "chore: release", "v0.1.27")
      await commit(dir, "wip, not a conventional message")
      expect(await decideIn(dir)).toMatchObject({ earned: "0.1.27", moved: false })
    } finally {
      cleanup(dir)
    }
  }, 30000)

  test("reads a type whatever its case, as changelogen's command does", async () => {
    const dir = await repo("0.1.27")
    try {
      await commit(dir, "chore: release", "v0.1.27")
      await commit(dir, "Fix: shouted")
      expect(await decideIn(dir)).toMatchObject({ earned: "0.1.28", moved: true })
    } finally {
      cleanup(dir)
    }
  }, 30000)

  test("a window whose commits changelogen drops from the changelog earns nothing", async () => {
    const dir = await repo("0.1.27")
    try {
      await commit(dir, "chore: release", "v0.1.27")
      await commit(dir, "chore(deps): bump something")
      await commit(dir, "ci(labels): retitle")
      expect(await decideIn(dir)).toMatchObject({ earned: "0.1.27", moved: false })
      await commit(dir, "build(deps): refresh the catalog")
      expect(await decideIn(dir)).toMatchObject({ earned: "0.1.28", moved: true })
    } finally {
      cleanup(dir)
    }
  }, 30000)

  test("the version field is read and written whatever its spacing", async () => {
    const dir = await repo("0.1.27")
    try {
      await commit(dir, "chore: release", "v0.1.27")
      await commit(dir, "feat: one")
      const file = join(dir, "package.json")
      await Bun.write(file, `{"name":"probe","version":"0.1.27"}\n`)
      await Bun.$`git -C ${dir} commit -q -am ${"chore: compact"}`
      expect(await decideIn(dir)).toMatchObject({ current: "0.1.27", earned: "0.1.28" })
      expect(await Bun.file(file).text()).toBe(`{"name":"probe","version":"0.1.27"}\n`)
      await writeVersion(file, "0.1.28")
      expect(await Bun.file(file).text()).toBe(`{"name":"probe","version":"0.1.28"}\n`)
    } finally {
      cleanup(dir)
    }
  }, 30000)

  test("the version field is the package's own, not one nested deeper", async () => {
    const dir = mkdtempSync(join(tmpdir(), "release-version-"))
    try {
      const file = join(dir, "package.json")
      await Bun.write(
        file,
        `{\n  "engines": { "version": "9.9.9" },\n  "name": "probe",\n  "version": "0.1.27"\n}\n`,
      )
      expect(await readVersion(file)).toBe("0.1.27")
      await writeVersion(file, "0.1.28")
      expect(await Bun.file(file).text()).toBe(
        `{\n  "engines": { "version": "9.9.9" },\n  "name": "probe",\n  "version": "0.1.28"\n}\n`,
      )
      await Bun.write(file, `{\n  "engines": { "version": "9.9.9" },\n  "name": "probe"\n}\n`)
      await expect(readVersion(file)).rejects.toThrow('no top-level "version" field')
    } finally {
      cleanup(dir)
    }
  })

  test("a broken changelog config is a failure, not an empty window", async () => {
    const dir = await repo("0.1.27")
    try {
      await commit(dir, "chore: release", "v0.1.27")
      await commit(dir, "feat: one")
      await Bun.write(join(dir, "changelog.config.json"), "{ broken\n")
      await expect(decideIn(dir)).rejects.toThrow()
      expect(await readVersion(join(dir, "package.json"))).toBe("0.1.27")
    } finally {
      cleanup(dir)
    }
  }, 30000)

  test("agrees with changelogen's own command on the number a window earns", async () => {
    const dir = await repo("0.1.27")
    try {
      await commit(dir, "chore: release", "v0.1.27")
      await commit(dir, "feat: one")
      await commit(dir, "chore(deps): bump something")
      await commit(dir, "fix(api)!: two")
      // The command looks every author up over the network while it renders; an empty exclusion matches every author, so this run stays offline.
      const configFile = join(dir, "changelog.config.json")
      const config = JSON.parse(await Bun.file(configFile).text())
      await Bun.write(configFile, JSON.stringify({ ...config, excludeAuthors: [""] }))
      const manifest = Bun.resolveSync("changelogen/package.json", join(script, ".."))
      const cli = join(manifest, "..", JSON.parse(await Bun.file(manifest).text()).bin.changelogen)
      const proc = Bun.spawnSync(
        [process.execPath, cli, "--bump", "--no-commit", "--from", "v0.1.27"],
        { cwd: dir, stderr: "pipe", stdout: "pipe" },
      )
      expect(proc.exitCode).toBe(0)
      const commanded = await readVersion(join(dir, "package.json"))
      expect(commanded).toBe("0.2.0")
      expect((await decideIn(dir)).earned).toBe(commanded)
    } finally {
      cleanup(dir)
    }
  }, 60000)

  test("the entry point prints the decision, and moves the tree only with --write", async () => {
    const dir = await repo("0.1.27")
    try {
      await commit(dir, "chore: release", "v0.1.27")
      await commit(dir, "feat: one")
      const decideVia = (...args: string[]) => {
        const proc = Bun.spawnSync([process.execPath, script, ...args], {
          cwd: dir,
          stderr: "pipe",
          stdout: "pipe",
        })
        expect(proc.exitCode).toBe(0)
        return JSON.parse(proc.stdout.toString())
      }
      expect(decideVia()).toMatchObject({ moved: true, next: "0.1.28" })
      expect(await readVersion(join(dir, "package.json"))).toBe("0.1.27")
      expect(decideVia("--write")).toMatchObject({ moved: true, next: "0.1.28" })
      expect(await readVersion(join(dir, "package.json"))).toBe("0.1.28")
      await Bun.$`git -C ${dir} commit -q -am ${"ci(version): bump to v0.1.28"}`
      expect(decideVia("--write")).toMatchObject({ current: "0.1.28", moved: false })
    } finally {
      cleanup(dir)
    }
  }, 60000)

  test("a tree already moved forward is not bumped twice", async () => {
    const dir = await repo("0.1.27")
    try {
      await commit(dir, "chore: release", "v0.1.27")
      await commit(dir, "feat: one")
      await setVersion(dir, "0.1.28")
      expect(await decideIn(dir)).toMatchObject({
        current: "0.1.28",
        earned: "0.1.28",
        moved: false,
      })
    } finally {
      cleanup(dir)
    }
  }, 30000)

  test("a hand-set major stays, and the computation touches no file", async () => {
    const dir = await repo("0.1.27")
    try {
      await commit(dir, "chore: release", "v0.1.27")
      await commit(dir, "feat: one")
      await setVersion(dir, "2.0.0")
      expect(await decideIn(dir)).toMatchObject({ earned: "0.1.28", moved: false, next: "2.0.0" })
      expect(await Bun.file(join(dir, "package.json")).text()).toContain('"version": "2.0.0"')
      expect(await Bun.file(join(dir, "CHANGELOG.md")).exists()).toBe(false)
    } finally {
      cleanup(dir)
    }
  }, 30000)

  test("tags that HEAD cannot reach stop the script instead of counting as no tag", async () => {
    const dir = await repo("0.1.27")
    try {
      await Bun.$`git -C ${dir} checkout -q -b elsewhere`
      await commit(dir, "chore: release elsewhere", "v0.1.27")
      await Bun.$`git -C ${dir} checkout -q canary`
      await commit(dir, "feat: one")
      await expect(decideIn(dir)).rejects.toThrow("none is reachable from HEAD")
    } finally {
      cleanup(dir)
    }
  }, 30000)

  test("a tree below the last tag is refused", async () => {
    const dir = await repo("0.1.27")
    try {
      await commit(dir, "chore: release", "v0.1.28")
      await commit(dir, "fix: one")
      await expect(decideIn(dir)).rejects.toThrow("below the last release v0.1.28")
    } finally {
      cleanup(dir)
    }
  }, 30000)
})
