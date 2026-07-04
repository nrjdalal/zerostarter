// Vendored from cross-spawn@7.0.6 (MIT, https://github.com/moxystudio/node-cross-spawn), condensed to one zero-dependency file: `which` / `path-key` / `shebang-command` / `shebang-regex` are inlined, and the async spawn + ENOENT re-emission are dropped (we only need sync, and our run() already reports errors). This gives Windows `.cmd`/`.ps1` shim + PATHEXT resolution without adding a package to the workspace catalog, which forks inherit even though the CLI itself is fork-excluded.

import { spawnSync as cpSpawnSync } from "node:child_process"
import type { SpawnSyncOptions, SpawnSyncReturns } from "node:child_process"
import { closeSync, openSync, readSync, statSync } from "node:fs"
import { delimiter, join, normalize, resolve } from "node:path"

// cross-spawn lib/util/escape.js — meta-char and argument escaping for cmd.exe.
const metaCharsRegExp = /([()\][%!^"`<>&|;, *?])/g
const escapeCommand = (arg: string): string => arg.replace(metaCharsRegExp, "^$1")
const escapeArgument = (arg: string, doubleEscapeMetaChars: boolean): string => {
  arg = `${arg}`
  arg = arg.replace(/(?=(\\+?)?)\1"/g, '$1$1\\"')
  arg = arg.replace(/(?=(\\+?)?)\1$/, "$1$1")
  arg = `"${arg}"`
  arg = arg.replace(metaCharsRegExp, "^$1")
  if (doubleEscapeMetaChars) arg = arg.replace(metaCharsRegExp, "^$1")
  return arg
}

// path-key: the case-correct PATH env var name (a Windows env may spell it "Path").
const pathKey = (env: NodeJS.ProcessEnv): string =>
  Object.keys(env)
    .reverse()
    .find((k) => k.toUpperCase() === "PATH") || "PATH"

// which.sync, minimal: walk PATH x PATHEXT for an existing file. withoutPathExt is cross-spawn's bare-name fallback attempt.
const resolveAttempt = (
  command: string,
  env: NodeJS.ProcessEnv,
  cwd: string,
  withoutPathExt: boolean,
): string | undefined => {
  const exts = withoutPathExt ? [""] : ["", ...(env.PATHEXT || "").split(delimiter)]
  const bases =
    command.includes("/") || command.includes("\\")
      ? [resolve(cwd, command)]
      : (env[pathKey(env)] || "").split(delimiter).map((d) => join(d, command))
  for (const base of bases) {
    for (const ext of exts) {
      try {
        if (statSync(base + ext).isFile()) return resolve(cwd, base + ext)
      } catch {
        // not this candidate; keep looking
      }
    }
  }
  return undefined
}
const resolveCommand = (command: string, env: NodeJS.ProcessEnv, cwd: string): string | undefined =>
  resolveAttempt(command, env, cwd, false) || resolveAttempt(command, env, cwd, true)

// shebang-command + shebang-regex: the interpreter a `#!` script runs under, or null.
const readShebang = (command: string): string | null => {
  const buffer = Buffer.alloc(150)
  try {
    const fd = openSync(command, "r")
    readSync(fd, buffer, 0, 150, 0)
    closeSync(fd)
  } catch {
    return null
  }
  const match = /^#!(.*)/.exec(buffer.toString())
  if (!match) return null
  const [bin, arg] = match[1]
    .replace(/\r?\n$/, "")
    .trim()
    .split(" ")
  const binary = bin.split("/").pop() || bin
  return binary === "env" ? arg : arg ? `${binary} ${arg}` : binary
}

const isExecutableRegExp = /\.(?:com|exe)$/i
const isCmdShimRegExp = /node_modules[\\/].bin[\\/][^\\/]+\.cmd$/i

type Parsed = { command: string; args: string[]; options: SpawnSyncOptions }

// cross-spawn lib/parse.js parseNonShell. isWin is injectable so the wrapping can be unit-tested off Windows.
export const parse = (
  command: string,
  args: string[],
  options: SpawnSyncOptions,
  isWin: boolean = process.platform === "win32",
): Parsed => {
  const parsed: Parsed = { command, args: args.slice(0), options: { ...options } }
  if (!isWin || options.shell) return parsed

  const env = (options.env as NodeJS.ProcessEnv) || process.env
  const cwd = options.cwd ? String(options.cwd) : process.cwd()
  let file = resolveCommand(parsed.command, env, cwd)
  const shebang = file && readShebang(file)
  if (shebang) {
    parsed.args.unshift(file as string)
    parsed.command = shebang
    file = resolveCommand(parsed.command, env, cwd)
  }

  const commandFile = file || parsed.command
  if (!isExecutableRegExp.test(commandFile)) {
    const needsDoubleEscape = isCmdShimRegExp.test(commandFile)
    parsed.command = escapeCommand(normalize(parsed.command))
    parsed.args = parsed.args.map((a) => escapeArgument(a, needsDoubleEscape))
    const shellCommand = [parsed.command].concat(parsed.args).join(" ")
    parsed.args = ["/d", "/s", "/c", `"${shellCommand}"`]
    parsed.command = process.env.comspec || "cmd.exe"
    parsed.options = { ...parsed.options, windowsVerbatimArguments: true }
  }
  return parsed
}

// Drop-in for child_process.spawnSync with Windows `.cmd`/`.ps1` shim + PATHEXT resolution.
export const spawnSync = (
  command: string,
  args: string[],
  options: SpawnSyncOptions,
): SpawnSyncReturns<string> => {
  const parsed = parse(command, args, options)
  return cpSpawnSync(parsed.command, parsed.args, parsed.options) as SpawnSyncReturns<string>
}
