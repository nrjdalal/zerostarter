import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import {
  findUsernameByEmail,
  getFullNameByUsername,
  processChangelog,
} from "../../../../packages/scripts/src/changelog-manager"

// The two GitHub REST reads go through a stubbed fetch, so each test sees the exact URL and headers sent and answers from a table of routes; the last test runs the whole script on a throwaway CHANGELOG.md.

type Route = { status?: number; body: unknown }

const sent: { url: string; headers: Headers }[] = []
let inFlight = 0
let maxInFlight = 0

function stubFetch(routes: Record<string, Route>) {
  return spyOn(globalThis, "fetch").mockImplementation((async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => {
    const url = String(input)
    sent.push({ url, headers: new Headers(init?.headers) })
    inFlight++
    maxInFlight = Math.max(maxInFlight, inFlight)
    await Bun.sleep(5)
    inFlight--
    const route = routes[url] ?? { status: 404, body: { message: "Not Found" } }
    return Response.json(route.body, { status: route.status ?? 200 })
  }) as typeof fetch)
}

beforeEach(() => {
  sent.length = 0
  inFlight = 0
  maxInFlight = 0
})

afterEach(() => {
  ;(globalThis.fetch as unknown as { mockRestore?: () => void }).mockRestore?.()
})

describe("the GitHub reads", () => {
  test("findUsernameByEmail asks for one commit by that author and returns its login", async () => {
    stubFetch({
      "https://api.github.com/repos/acme/widgets/commits?author=dev%40example.com&per_page=1": {
        body: [{ author: { login: "devperson" } }],
      },
    })
    expect(await findUsernameByEmail("t0ken", "dev@example.com", "acme", "widgets")).toBe(
      "devperson",
    )
    expect(sent).toHaveLength(1)
    const headers = sent[0].headers
    expect(headers.get("accept")).toBe("application/vnd.github+json")
    expect(headers.get("authorization")).toBe("Bearer t0ken")
    expect(headers.get("user-agent")).toBe("changelog-manager")
    expect(headers.get("x-github-api-version")).toBe("2022-11-28")
  })

  test("findUsernameByEmail returns null for a commit with no linked account, and on an error", async () => {
    stubFetch({
      "https://api.github.com/repos/acme/widgets/commits?author=ghost%40example.com&per_page=1": {
        body: [{ author: null }],
      },
      "https://api.github.com/repos/acme/widgets/commits?author=down%40example.com&per_page=1": {
        status: 500,
        body: {},
      },
    })
    expect(await findUsernameByEmail("t0ken", "ghost@example.com", "acme", "widgets")).toBeNull()
    expect(await findUsernameByEmail("t0ken", "down@example.com", "acme", "widgets")).toBeNull()
  })

  test("getFullNameByUsername returns the profile name, and null when the user is missing", async () => {
    stubFetch({
      "https://api.github.com/users/octo-cat": { body: { login: "octo-cat", name: "Octo Cat" } },
    })
    expect(await getFullNameByUsername("t0ken", "octo-cat")).toBe("Octo Cat")
    expect(await getFullNameByUsername("t0ken", "nobody")).toBeNull()
    expect(sent.map((request) => request.url)).toEqual([
      "https://api.github.com/users/octo-cat",
      "https://api.github.com/users/nobody",
    ])
  })
})

describe("processChangelog", () => {
  const env = { repository: process.env.GITHUB_REPOSITORY, token: process.env.GITHUB_TOKEN }
  const cwd = process.cwd()
  let dir = ""

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "changelog-manager-"))
    process.chdir(dir)
    process.env.GITHUB_REPOSITORY = "acme/widgets"
    process.env.GITHUB_TOKEN = "t0ken"
  })

  afterEach(() => {
    process.chdir(cwd)
    rmSync(dir, { recursive: true, force: true })
    process.env.GITHUB_REPOSITORY = env.repository
    process.env.GITHUB_TOKEN = env.token
  })

  test("rewrites the newest contributors section one request at a time and leaves older sections alone", async () => {
    const changelog = [
      "# Changelog",
      "",
      "## v0.2.0",
      "",
      "[compare changes](https://github.com/acme/widgets/compare/abc123...v0.2.0)",
      "",
      "### ❤️ Contributors",
      "",
      "- Dev Person <dev@example.com>",
      "- Octo Cat ([@octo](https://github.com/octo))",
      "- Bot Account <12345+botacct@users.noreply.github.com>",
      "- Plain Name <nobody@example.com>",
      "",
      "## v0.1.0",
      "",
      "[compare changes](https://github.com/acme/widgets/compare/def456...v0.1.0)",
      "",
      "### ❤️ Contributors",
      "",
      "- Dev Person <dev@example.com>",
      "",
    ].join("\n")
    await Bun.write(join(dir, "CHANGELOG.md"), changelog)
    stubFetch({
      "https://api.github.com/repos/acme/widgets/commits?author=dev%40example.com&per_page=1": {
        body: [{ author: { login: "devperson" } }],
      },
      "https://api.github.com/users/devperson": { body: { name: "Dev Person" } },
      "https://api.github.com/users/octo": { body: { name: "Octavia Cat" } },
      "https://api.github.com/users/botacct": { body: { name: null } },
      "https://api.github.com/repos/acme/widgets/commits?author=nobody%40example.com&per_page=1": {
        body: [],
      },
    })

    await processChangelog()

    const lines = (await Bun.file(join(dir, "CHANGELOG.md")).text()).split("\n")
    expect(lines[4]).toBe(
      "[compare changes](https://github.com/acme/widgets/compare/v0.1.0...v0.2.0)",
    )
    expect(lines.slice(8, 12)).toEqual([
      "- Dev Person @devperson",
      "- Octavia Cat @octo",
      "- Bot Account @botacct",
      "- Plain Name <nobody@example.com>",
    ])
    expect(lines[19]).toBe("- Dev Person <dev@example.com>")
    expect(sent).toHaveLength(5)
    expect(maxInFlight).toBe(1)
  })
})
