// Vendored/condensed from nano-spawn@2.1.0 (MIT, https://github.com/sindresorhus/nano-spawn): the async spawn plus its Windows shim handling. On Windows a non-`.exe`/`.com` file (e.g. a package-manager-installed `bunx.cmd`) is run with `shell: true` and cmd.exe-escaped file+args (escaping itself lifted from cross-spawn), which raw `child_process` cannot launch. Vendored (not a dependency) so nothing lands in the workspace catalog, which forks inherit. Condensed to what the CLI needs: iteration, piping, and template-literal helpers are omitted.

import { spawn } from "node:child_process"
import type { SpawnOptions } from "node:child_process"
import { access } from "node:fs/promises"
import { delimiter, resolve } from "node:path"

export class SubprocessError extends Error {
  override name = "SubprocessError"
  exitCode?: number
  stdout = ""
  stderr = ""
}

const exeExtensions = [".exe", ".com"]

// cmd.exe escaping (nano-spawn windows.js, taken from cross-spawn). Exported for tests since the win32 branch never runs on CI.
export const escapeFile = (file: string): string =>
  file.replaceAll(/([()\][%!^"`<>&|;, *?])/g, "^$1")
export const escapeArgument = (argument: string): string =>
  escapeFile(escapeFile(`"${argument.replaceAll(/(\\*)"/g, '$1$1\\"').replace(/(\\*)$/, "$1$1")}"`))

// Whether `file` is a .exe/.com directly, or resolvable to one via PATH x those extensions.
const isExe = async (file: string, cwd: string, env: NodeJS.ProcessEnv): Promise<boolean> => {
  if (exeExtensions.some((ext) => file.toLowerCase().endsWith(ext))) return true
  const rawPath = env.PATH || (env as { Path?: string }).Path || ""
  const parts = rawPath
    .split(delimiter)
    .filter(Boolean)
    .map((part) => part.replace(/^"(.*)"$/, "$1"))
  try {
    await Promise.any(
      [cwd, ...parts].flatMap((part) =>
        exeExtensions.map((ext) => access(`${resolve(part, file)}${ext}`)),
      ),
    )
    return true
  } catch {
    return false
  }
}

// nano-spawn applyForceShell: on Windows a non-exe file needs a shell, so escape file+args and set shell. isWin is injectable so the branch can be tested off Windows.
export const applyForceShell = async (
  file: string,
  args: string[],
  options: SpawnOptions,
  isWin: boolean = process.platform === "win32",
): Promise<[string, string[], SpawnOptions]> => {
  const cwd = options.cwd ? String(options.cwd) : "."
  const env = (options.env as NodeJS.ProcessEnv) || process.env
  if (isWin && !options.shell && !(await isExe(file, cwd, env))) {
    return [escapeFile(file), args.map(escapeArgument), { ...options, shell: true }]
  }
  return [file, args, options]
}

export type SpawnResult = { stdout: string; stderr: string }

// Async spawn: applies the Windows shim handling, captures piped stdout/stderr (inherit/ignore forward instead), resolves on exit 0, and throws a SubprocessError carrying stdout/stderr on a spawn error or non-zero exit.
export const nanoSpawn = async (
  file: string,
  args: string[],
  options: SpawnOptions,
): Promise<SpawnResult> => {
  const command = [file, ...args].join(" ")
  let [f, a, opts] = await applyForceShell(file, args, options)
  // nano-spawn concatenateShell: join into one string under a shell so Node does not warn (Node 24+).
  if (opts.shell && a.length > 0) {
    f = [f, ...a].join(" ")
    a = []
  }
  const child = spawn(f, a, opts)
  let stdout = ""
  let stderr = ""

  return new Promise<SpawnResult>((resolvePromise, rejectPromise) => {
    const fail = (message: string, exitCode?: number, cause?: unknown): void => {
      const error = new SubprocessError(message, cause ? { cause } : undefined)
      error.stdout = stdout
      error.stderr = stderr
      error.exitCode = exitCode
      rejectPromise(error)
    }
    // A readable stream that emits `error` with no listener crashes the process; ignore the benign close/pipe codes (as upstream nano-spawn does) and surface the rest as a rejection.
    const onStreamError = (err: NodeJS.ErrnoException): void => {
      if (err.code !== "ERR_STREAM_PREMATURE_CLOSE" && err.code !== "EPIPE") {
        fail(`Command failed: ${command}`, undefined, err)
      }
    }
    if (child.stdout) {
      child.stdout.setEncoding("utf8")
      child.stdout.on("data", (chunk) => (stdout += chunk))
      child.stdout.on("error", onStreamError)
    }
    if (child.stderr) {
      child.stderr.setEncoding("utf8")
      child.stderr.on("data", (chunk) => (stderr += chunk))
      child.stderr.on("error", onStreamError)
    }
    child.on("error", (err) => fail(`Command failed: ${command}`, undefined, err))
    child.on("close", (code, signal) => {
      if (signal) return fail(`Command was terminated with ${signal}: ${command}`)
      if (code !== 0)
        return fail(`Command failed with exit code ${code}: ${command}`, code ?? undefined)
      resolvePromise({ stdout, stderr })
    })
  })
}
