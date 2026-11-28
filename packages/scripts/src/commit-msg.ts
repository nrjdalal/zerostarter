// The commit-msg hook: @commitlint/config-conventional 21.2.4's rules, read with commitlint's own parser settings and default ignores (rule set from config-conventional, MIT, Copyright (c) 2016 - present Mario Nebl)
const TYPES = [
  "build",
  "chore",
  "ci",
  "docs",
  "feat",
  "fix",
  "perf",
  "refactor",
  "revert",
  "style",
  "test",
]
const MAX = 100
const URL = /\bhttps?:\/\/\S+/
const SCISSOR = "------------------------ >8 ------------------------"
const NOTE = /^(?:\*\s+)?(BREAKING CHANGE|BREAKING-CHANGE):\s*(.*)/i
const FOOTER_TOKEN = /^(?:BREAKING CHANGE|[\w-]+)(?::\s+|\s+(?:#)).+/i
const SEMVER =
  /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][a-zA-Z0-9-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][a-zA-Z0-9-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/

// commitlint's default ignores (@commitlint/is-ignored): merges, reverts, fixups and a bare version
const IGNORES: ((message: string) => boolean)[] = [
  (m) =>
    /^((Merge pull request)|(Merge (.*?) into (.*?)|(Merge branch (.*?)))(?:\r?\n)*$)/m.test(m),
  (m) => /^(Merge tag (.*?))(?:\r?\n)*$/m.test(m),
  (m) => /^(R|r)evert (.*)/.test(m),
  (m) => /^(R|r)eapply (.*)/.test(m),
  (m) => /^(amend|fixup|squash)!/.test(m),
  (m) => {
    const version = (m.split("\n")[0] ?? "")
      .replace(/^chore(\([^)]+\))?:/, "")
      .replace(/\[(skip|ci)(-|\s)(ci|skip)\]/i, "")
      .replace(/\((skip|ci)(-|\s)(ci|skip)\)/i, "")
      .trim()
    return version.length <= 256 && SEMVER.test(version)
  },
  (m) => /^(Merged (.*?)(in|into) (.*)|Merged PR (.*): (.*))/.test(m),
  (m) => /^Merge remote-tracking branch(\s*)(.*)/.test(m),
  (m) => /^Automatic merge(.*)/.test(m),
  (m) => /^Auto-merged (.*?) into (.*)/.test(m),
]

const trimNewLines = (s: string) => s.replace(/^[\r\n]+|[\r\n]+$/g, "")
const append = (src: string | null, line: string) => (src ? `${src}\n${line}` : line)
const fits = (text: string) =>
  text.split(/\r?\n/).every((line) => URL.test(line) || line.length <= MAX)

export type Verdict = { errors: string[]; warnings: string[] }

// Pure: the rules' verdict on one message, comment lines read by commentChar as git's core.commentChar sets them
export function lint(message: string, commentChar = "#"): Verdict {
  const errors: string[] = []
  const warnings: string[] = []
  if (message === "" || IGNORES.some((ignored) => ignored(message.trimEnd())))
    return { errors, warnings }
  if (!message.trim()) return { errors: ["the message is empty [parse]"], warnings }
  const raw = trimNewLines(message).split(/\r?\n/)
  const cut = raw.indexOf(`${commentChar} ${SCISSOR}`)
  const lines = (cut === -1 ? raw : raw.slice(0, cut)).filter(
    (line) => !line.startsWith(commentChar) && !/^\s*gpg:/.test(line),
  )
  const header = lines[0] || null
  let body: string | null = null
  let footer: string | null = null
  let i = 1
  // the parser's notes: a BREAKING CHANGE line takes the lines after it into the footer, up to the next footer token
  const notes = (): boolean => {
    if (i >= lines.length || !NOTE.test(lines[i]!)) return false
    footer = append(footer, lines[i++]!)
    while (i < lines.length) {
      if (notes()) return true
      const token = FOOTER_TOKEN.test(lines[i]!)
      footer = append(footer, lines[i++]!)
      if (token) break
    }
    return true
  }
  let isBody = true
  while (i < lines.length) {
    if (notes()) isBody = false
    if (i >= lines.length) break
    const stillBody = !FOOTER_TOKEN.test(lines[i]!) && isBody
    if (stillBody) body = append(body, lines[i]!)
    else footer = append(footer, lines[i]!)
    i++
    if (!stillBody) isBody = false
  }
  body = body && trimNewLines(body)
  footer = footer && trimNewLines(footer)
  if (header === null && body === null && footer === null) return { errors, warnings }
  const toLines = message.split(/\r?\n/)
  if (body && toLines[1] !== "")
    warnings.push("body must have leading blank line [body-leading-blank]")
  if (footer) {
    const at = toLines.indexOf(footer.split(/\r?\n/)[0]!)
    if (toLines.slice(at - 1)[0] !== "")
      warnings.push("footer must have leading blank line [footer-leading-blank]")
  }
  if (body && !fits(body))
    errors.push(`body's lines must not be longer than ${MAX} characters [body-max-line-length]`)
  if (footer && !fits(footer))
    errors.push(`footer's lines must not be longer than ${MAX} characters [footer-max-line-length]`)
  if (header === null || header.length > MAX)
    errors.push(
      `header must not be longer than ${MAX} characters, current length is ${header?.length} [header-max-length]`,
    )
  if (header && header.trim() !== header)
    errors.push("header must not be surrounded by whitespace [header-trim]")
  const parts =
    header?.match(/^(\w*)(?:\((.*)\))?!: (.*)$/) ?? header?.match(/^(\w*)(?:\((.*)\))?!?: (.*)$/)
  const type = parts?.[1] || null
  const subject = parts?.[3] || null
  if (subject && /^[\p{Ll}\p{Lu}\p{Lt}]/iu.test(subject)) {
    const text = subject.replace(/`.*?`|".*?"|'.*?'/g, "").trim()
    if (text.substring(0, 1).toUpperCase() + text.substring(1) === text)
      errors.push(
        "subject must not be sentence-case, start-case, pascal-case, upper-case [subject-case]",
      )
  }
  if (!subject) errors.push("subject may not be empty [subject-empty]")
  const colon = header?.indexOf(":") || 0
  if (
    !(colon > 0 && colon === header!.length - 1) &&
    header?.endsWith(".") &&
    !header.endsWith("...")
  )
    errors.push("subject may not end with full stop [subject-full-stop]")
  if (type && !/^\d/.test(type) && type.toLowerCase() !== type)
    errors.push("type must be lower-case [type-case]")
  if (!type) errors.push("type may not be empty [type-empty]")
  if (type && !TYPES.includes(type))
    errors.push(`type must be one of [${TYPES.join(", ")}] [type-enum]`)
  return { errors, warnings }
}

if (import.meta.main) {
  const file = Bun.argv[2]
  if (!file) {
    console.error("usage: bun packages/scripts/src/commit-msg.ts <commit message file>")
    process.exit(1)
  }
  const git = Bun.spawnSync(["git", "config", "core.commentChar"], { stderr: "ignore" })
  const commentChar = git.stdout.toString().trim() || "#"
  const message = await Bun.file(file).text()
  const { errors, warnings } = lint(message, commentChar)
  for (const line of [...errors.map((e) => `✖   ${e}`), ...warnings.map((w) => `⚠   ${w}`)])
    console.error(line)
  if (errors.length) {
    console.error(`\n✖   found ${errors.length} problems, ${warnings.length} warnings`)
    process.exit(1)
  }
}
