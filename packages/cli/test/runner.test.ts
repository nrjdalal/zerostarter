import { expect, test } from "bun:test"

import { bunInstallCommand, detectRunner, zerostarterCommand } from "@/runner"

test("detectRunner maps npm_config_user_agent to the invoking runner", () => {
  expect(detectRunner("bun/1.3.14 npm/? node/v24")).toBe("bunx")
  expect(detectRunner("pnpm/9.1.0 npm/? node/v22")).toBe("pnpm dlx")
  expect(detectRunner("yarn/4.2.0 npm/? node/v22")).toBe("yarn dlx")
  expect(detectRunner("npm/10.8.0 node/v22")).toBe("npx")
  expect(detectRunner("")).toBe("unknown")
})

test("bunInstallCommand matches the runner, defaulting to npm", () => {
  expect(bunInstallCommand("npx")).toEqual({ cmd: "npm", args: ["install", "-g", "bun"] })
  expect(bunInstallCommand("pnpm dlx")).toEqual({ cmd: "pnpm", args: ["add", "-g", "bun"] })
  expect(bunInstallCommand("yarn dlx")).toEqual({ cmd: "yarn", args: ["global", "add", "bun"] })
  expect(bunInstallCommand("unknown")).toEqual({ cmd: "npm", args: ["install", "-g", "bun"] })
})

test("zerostarterCommand reconstructs the command the user ran", () => {
  expect(zerostarterCommand(["init", "-y"])).toBe("zerostarter init -y")
  expect(zerostarterCommand(["reinit"])).toBe("zerostarter reinit")
  expect(zerostarterCommand([])).toBe("zerostarter")
})
