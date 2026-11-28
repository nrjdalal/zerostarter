// Messages and the rules commitlint 21.2.4 with config-conventional fails or warns on for each, the table commit-msg.test.ts holds the hook to; each row's verdict was read from commitlint itself at canary
export type Case = { errors: string[]; message: string; name: string; warnings?: string[] }

const long = (n: number) => "x".repeat(n)

export const CASES: Case[] = [
  { errors: [], message: "feat: add a page", name: "a plain good header" },
  {
    errors: [],
    message: "fix(api): keep the session\n",
    name: "a scope and git's trailing newline",
  },
  { errors: [], message: "feat(api)!: drop the v1 routes", name: "a breaking bang" },
  // body-leading-blank
  {
    errors: [],
    message: "feat: a\nbody right under",
    name: "body-leading-blank warns only",
    warnings: ["body-leading-blank"],
  },
  { errors: [], message: "feat: a\n\nbody after a blank", name: "body-leading-blank passes" },
  // body-max-line-length
  {
    errors: ["body-max-line-length"],
    message: `feat: a\n\n${long(101)}`,
    name: "body-max-line-length at 101",
  },
  { errors: [], message: `feat: a\n\n${long(100)}`, name: "body-max-line-length at 100" },
  {
    errors: [],
    message: `feat: a\n\nsee https://example.com/${long(100)}`,
    name: "body-max-line-length skips a URL line",
  },
  // footer-leading-blank
  {
    errors: [],
    message: "feat: a\n\nbody\nCloses #12",
    name: "footer-leading-blank warns only",
    warnings: ["footer-leading-blank"],
  },
  { errors: [], message: "feat: a\n\nbody\n\nCloses #12", name: "footer-leading-blank passes" },
  // footer-max-line-length
  {
    errors: ["footer-max-line-length"],
    message: `feat: a\n\nbody\n\nRefs: ${long(100)}`,
    name: "footer-max-line-length at 106",
  },
  {
    errors: ["footer-max-line-length"],
    message: `feat: a\n\nBREAKING CHANGE: gone\n${long(101)}`,
    name: "a note's next line is footer",
  },
  {
    errors: [],
    message: `feat: a\n\nbody\n\nRefs: https://example.com/${long(100)}`,
    name: "footer-max-line-length skips a URL line",
  },
  // header-max-length
  { errors: ["header-max-length"], message: `feat: ${long(95)}`, name: "header-max-length at 101" },
  { errors: [], message: `feat: ${long(94)}`, name: "header-max-length at 100" },
  // header-trim
  { errors: ["header-trim"], message: "feat: a ", name: "header-trim on a trailing space" },
  {
    errors: ["header-trim", "subject-empty", "type-empty"],
    message: " feat: a",
    name: "header-trim on a leading space, which no header pattern reads",
  },
  // subject-case
  { errors: ["subject-case"], message: "feat: Add a page", name: "subject-case on sentence case" },
  { errors: ["subject-case"], message: "feat: ADD A PAGE", name: "subject-case on upper case" },
  { errors: ["subject-case"], message: "feat: Add A Page", name: "subject-case on start case" },
  { errors: ["subject-case"], message: "feat: AddPage", name: "subject-case on pascal case" },
  { errors: [], message: "feat: add `Foo` support", name: "subject-case strips a quoted name" },
  {
    errors: [],
    message: "feat: 2 new pages",
    name: "subject-case skips a subject that starts with a digit",
  },
  { errors: [], message: "feat: iOS support", name: "subject-case passes camel case" },
  // subject-empty
  {
    errors: ["subject-empty", "type-empty"],
    message: "add a page",
    name: "subject-empty and type-empty with no type",
  },
  {
    errors: ["subject-empty", "type-empty"],
    message: "feat:",
    name: "subject-empty on a bare type",
  },
  // subject-full-stop
  {
    errors: ["subject-full-stop"],
    message: "feat: add a page.",
    name: "subject-full-stop on a full stop",
  },
  { errors: [], message: "feat: wait for it...", name: "subject-full-stop skips an ellipsis" },
  // type-case
  {
    errors: ["type-case", "type-enum"],
    message: "Feat: add a page",
    name: "type-case on a capital",
  },
  {
    errors: ["type-case", "type-enum"],
    message: "FIX: add a page",
    name: "type-case on upper case",
  },
  // type-empty
  { errors: ["type-empty"], message: ": add a page", name: "type-empty on an empty type" },
  // type-enum
  { errors: ["type-enum"], message: "feature: add a page", name: "type-enum on an unknown type" },
  { errors: [], message: "revert: undo the page", name: "type-enum takes revert" },
  // what commitlint skips or strips
  { errors: [], message: "Merge branch 'canary' into feat/x", name: "a merge is ignored" },
  {
    errors: [],
    message: 'Revert "feat: add a page"\n\nThis reverts commit abc.',
    name: "a revert is ignored",
  },
  { errors: [], message: "fixup! feat: add a page", name: "a fixup is ignored" },
  { errors: [], message: "v1.2.3", name: "a bare version is ignored" },
  { errors: [], message: "chore: 0.1.48", name: "a chore version is ignored" },
  {
    errors: [],
    message: "feat: add a page\n\n# Please enter the commit message\n# " + long(120),
    name: "comment lines are dropped",
  },
  {
    errors: [],
    message:
      "feat: add a page\n# ------------------------ >8 ------------------------\n" + long(120),
    name: "the scissor cuts what follows",
  },
  { errors: [], message: "", name: "an empty message passes" },
  { errors: [], message: "# only a comment\n", name: "a message of comments passes" },
]
