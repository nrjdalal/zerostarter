import { afterEach, beforeEach, describe, expect, test } from "bun:test"

import { promptMultiselect } from "../bin/commands/_prompt"

type Tty = { isTTY?: boolean }

// Force the non-interactive branch so the test never blocks on raw-mode stdin, even when `bun test` runs in a real terminal.
describe("promptMultiselect (non-interactive)", () => {
  let stdout: boolean | undefined
  let stdin: boolean | undefined
  beforeEach(() => {
    stdout = process.stdout.isTTY
    stdin = process.stdin.isTTY
    ;(process.stdout as Tty).isTTY = false
    ;(process.stdin as Tty).isTTY = false
  })
  afterEach(() => {
    ;(process.stdout as Tty).isTTY = stdout
    ;(process.stdin as Tty).isTTY = stdin
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
})
