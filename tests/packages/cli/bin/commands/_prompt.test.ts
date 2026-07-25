import { afterEach, beforeEach, describe, expect, test } from "bun:test"

import { promptMultiselect } from "../../../../../packages/cli/bin/commands/_prompt"

type Tty = { isTTY?: boolean }

// Force the non-interactive branch so the test never blocks on raw-mode stdin when bun test runs in a real terminal. Best-effort: piped streams (CI) already report isTTY false but expose it read-only, so swallow that assignment and rely on the already-non-interactive streams there.
const setTty = (out: boolean | undefined, inp: boolean | undefined): void => {
  try {
    ;(process.stdout as Tty).isTTY = out
    ;(process.stdin as Tty).isTTY = inp
  } catch {
    // isTTY is read-only on piped streams (CI); they are already non-interactive, so no override is needed there.
  }
}

describe("promptMultiselect (non-interactive)", () => {
  let stdout: boolean | undefined
  let stdin: boolean | undefined
  beforeEach(() => {
    stdout = process.stdout.isTTY
    stdin = process.stdin.isTTY
    setTty(false, false)
  })
  afterEach(() => {
    setTty(stdout, stdin)
  })

  test("echoes and returns the pre-checked defaults", async () => {
    const result = await promptMultiselect("Which features?", [
      { value: "apiDocs", label: "API docs", checked: true },
      { value: "blog", label: "Blog", checked: false },
      { value: "docs", label: "Docs", checked: true },
    ])
    expect(result).toEqual(["apiDocs", "docs"])
  })

  test("returns [] when nothing is pre-checked", async () => {
    const result = await promptMultiselect("Which features?", [
      { value: "a", label: "A", checked: false },
      { value: "b", label: "B", checked: false },
    ])
    expect(result).toEqual([])
  })

  test("returns [] for an empty option list", async () => {
    expect(await promptMultiselect("Which features?", [])).toEqual([])
  })
})
