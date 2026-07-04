import { expect, test } from "bun:test"

import { parse, spawnSync } from "@/vendor/cross-spawn"

test("parse is a passthrough off Windows", () => {
  expect(parse("node", ["--version"], {}, false)).toEqual({
    command: "node",
    args: ["--version"],
    options: {},
  })
})

test("parse wraps a Windows .cmd shim in cmd.exe with escaped args", () => {
  const p = parse("zs-nonexistent.cmd", ["a b", "x&y"], {}, true)
  expect(p.command).toBe(process.env.comspec || "cmd.exe")
  expect(p.options.windowsVerbatimArguments).toBe(true)
  expect(p.args).toEqual(["/d", "/s", "/c", `"zs-nonexistent.cmd ^"a^ b^" ^"x^&y^""`])
})

test("spawnSync runs a real command and captures output", () => {
  const r = spawnSync("node", ["-e", "process.stdout.write('ok')"], { encoding: "utf8" })
  expect(r.status).toBe(0)
  expect(r.stdout).toBe("ok")
})
