import { readFileSync, writeFileSync } from "node:fs"
import { Octokit } from "@octokit/rest"

const CHANGELOG_PATH = "CHANGELOG.md"
const EMAIL_REGEX = /<([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)>/g

async function searchCommits(octokit: Octokit, email: string): Promise<string | null> {
  const { data } = await octokit.search.commits({
    q: `author-email:${email}`,
    sort: "author-date",
    per_page: 1,
  })

  if (data.total_count === 0) {
    return null
  }

  return data.items[0]?.author?.login ?? null
}

async function getUsernameFromEmail(email: string): Promise<string | null> {
  try {
    if (!(typeof email === "string" && email.includes("@"))) {
      return null
    }

    const token = process.env.GITHUB_TOKEN
    const octokit = new Octokit({
      auth: token,
      userAgent: "https://github.com/nrjdalal/zerostarter",
    })

    const { data } = await octokit.search.users({
      q: `${email} in:email`,
    })

    if (data.total_count === 0) {
      return await searchCommits(octokit, email)
    }

    return data.items[0]?.login ?? null
  } catch {
    return null
  }
}

async function processChangelog() {
  const content = readFileSync(CHANGELOG_PATH, "utf-8")
  const emailToUsername = new Map<string, string | null>()

  // Find all unique emails (Set ensures uniqueness)
  const emails = new Set<string>()
  let match
  while ((match = EMAIL_REGEX.exec(content)) !== null) {
    emails.add(match[1])
  }

  // Look up usernames for each unique email only once
  for (const email of emails) {
    const username = await getUsernameFromEmail(email)
    emailToUsername.set(email, username)
    if (username) {
      console.log(`Found @${username} for ${email}`)
    } else {
      console.log(`No username found for ${email}`)
    }
  }

  // Replace emails with usernames
  let updatedContent = content
  for (const [email, username] of emailToUsername) {
    if (username) {
      updatedContent = updatedContent.replaceAll(`<${email}>`, `@${username}`)
    } else {
      updatedContent = updatedContent
        .split("\n")
        .filter((line) => !line.includes(`<${email}>`))
        .join("\n")
    }
  }

  writeFileSync(CHANGELOG_PATH, updatedContent, "utf-8")
  console.log("Changelog updated successfully!")
}

processChangelog().catch(console.error)
