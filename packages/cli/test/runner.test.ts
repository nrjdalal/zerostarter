import { expect, test } from "bun:test"

import { bunInstallCommand, detectRunner, zerostarterCommand } from "@/runner"

test("detectRunner maps npm_config_user_agent to the invoking runner", () => {
  expect(detectRunner("bun/1.3.14 npm/? node/v24")).toBe("bunx")
  expect(detectRunner("pnpm/9.1.0 npm/? node/v22")).toBe("pnpm dlx")
  expect(detectRunner("yarn/4.2.0 npm/? node/v22")).toBe("yarn dlx")
  expect(detectRunner("npm/10.8.0 node/v22")).toBe("npx")
  expect(detectRunner("")).toBe("unknown")
})

test("bunInstallCommand uses the official bun installer per OS", () => {
  const unix = { cmd: "bash", args: ["-c", "curl -fsSL https://bun.sh/install | bash"] }
  expect(bunInstallCommand("darwin")).toEqual(unix)
  expect(bunInstallCommand("linux")).toEqual(unix)
  expect(bunInstallCommand("win32")).toEqual({
    cmd: "powershell",
    args: ["-Command", "irm bun.sh/install.ps1 | iex"],
  })
})

test("zerostarterCommand reconstructs the command the user ran", () => {
  expect(zerostarterCommand(["init", "-y"])).toBe("zerostarter init -y")
  expect(zerostarterCommand(["reinit"])).toBe("zerostarter reinit")
  expect(zerostarterCommand([])).toBe("zerostarter")
})
