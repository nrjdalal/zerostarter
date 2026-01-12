import { Octokit } from "@octokit/rest"
import { readFileSync, writeFileSync } from "node:fs"

const CHANGELOG_PATH = "CHANGELOG.md"

function extractEmailAndUsername(contributorLine: string): {
  email: string | null
  username: string | null
} {
  const content = contributorLine.replace(/^-\s+/, "").trim()

  const markdownLinkMatch = content.match(/\(\[@(\w+)\]\(https?:\/\/github\.com\/[\w-]+\/?\)\)/)
  if (markdownLinkMatch) {
    return { email: null, username: markdownLinkMatch[1] }
  }

  const emailMatch = content.match(/<([^>]+)>/)
  if (emailMatch) {
    const email = emailMatch[1]
    const githubEmailMatch = email.match(/^(\d+\+)?(\w+)@users\.noreply\.github\.com$/)
    if (githubEmailMatch) {
      return { email: null, username: githubEmailMatch[2] }
    }
    return { email, username: null }
  }

  const directMatch = content.match(/@(\w+)/)
  if (directMatch) {
    return { email: null, username: directMatch[1] }
  }

  return { email: null, username: null }
}

async function findUsernameByEmail(
  octokit: Octokit,
  email: string,
  repoOwner: string,
  repoName: string,
): Promise<string | null> {
  try {
    const { data: commits } = await octokit.rest.repos.listCommits({
      owner: repoOwner,
      repo: repoName,
      author: email,
      per_page: 1,
    })

    return commits[0]?.author?.login ?? null
  } catch {
    return null
  }
}

async function getFullNameByUsername(octokit: Octokit, username: string): Promise<string | null> {
  try {
    const { data: user } = await octokit.rest.users.getByUsername({ username })
    return user.name
  } catch {
    return null
  }
}

function updateCompareLinks(lines: string[], repoOwner: string, repoName: string): void {
  const versionSections: number[] = []
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().match(/^## v\d+\.\d+\.\d+/)) {
      versionSections.push(i)
    }
  }

  for (let i = 0; i < versionSections.length; i++) {
    const versionSectionIndex = versionSections[i]
    const currentVersionMatch = lines[versionSectionIndex].trim().match(/^## (v\d+\.\d+\.\d+)/)
    if (!currentVersionMatch) continue

    const currentVersion = currentVersionMatch[1]
    const compareLineIndex = versionSectionIndex + 2

    if (compareLineIndex >= lines.length) continue

    const compareLine = lines[compareLineIndex].trim()
    const compareMatch = compareLine.match(
      /\[compare changes\]\(https:\/\/github\.com\/[\w-]+\/[\w-]+\/compare\/([\da-f]+)\.\.\.([\w.-]+)\)/,
    )

    if (!compareMatch) continue

    if (i + 1 < versionSections.length) {
      const nextVersionSectionIndex = versionSections[i + 1]
      const prevVersionMatch = lines[nextVersionSectionIndex].trim().match(/^## (v\d+\.\d+\.\d+)/)
      if (prevVersionMatch) {
        const prevVersion = prevVersionMatch[1]
        const newCompareLink = `[compare changes](https://github.com/${repoOwner}/${repoName}/compare/${prevVersion}...${currentVersion})`
        lines[compareLineIndex] = newCompareLink
      }
    }
  }
}

async function processChangelog() {
  const repoOwner = process.env.GITHUB_REPOSITORY_OWNER || "nrjdalal"
  const repoName = process.env.GITHUB_REPOSITORY_NAME || "zerostarter"

  const content = readFileSync(CHANGELOG_PATH, "utf-8")
  const lines = content.split("\n")

  updateCompareLinks(lines, repoOwner, repoName)

  const token = process.env.GITHUB_TOKEN
  if (!token) {
    writeFileSync(CHANGELOG_PATH, lines.join("\n"), "utf-8")
    return
  }

  const octokit = new Octokit({ auth: token })

  const firstContributorSection = lines.findIndex((line) => line.trim() === "### ❤️ Contributors")

  if (firstContributorSection === -1) {
    console.log("No contributors section found")
    return
  }

  const contributorIndices: number[] = []
  const contributorEntries: string[] = []

  for (let i = firstContributorSection + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.startsWith("##")) {
      break
    }
    if (line.startsWith("- ")) {
      contributorIndices.push(i)
      contributorEntries.push(line)
    }
  }

  const formattedContributors = await Promise.all(
    contributorEntries.map(async (entry) => {
      const nameMatch = entry.match(/^-\s+(.+?)(?:\s+[@<]|$)/)
      const fallbackName = nameMatch ? nameMatch[1].trim() : ""

      const { email, username: extractedUsername } = extractEmailAndUsername(entry)

      let username = extractedUsername
      if (!username && email) {
        username = await findUsernameByEmail(octokit, email, repoOwner, repoName)
      }

      if (username) {
        const fullName = await getFullNameByUsername(octokit, username)
        return `- ${fullName || fallbackName} @${username}`
      }

      return entry
    }),
  )

  formattedContributors.forEach((formatted, index) => {
    lines[contributorIndices[index]] = formatted
  })

  writeFileSync(CHANGELOG_PATH, lines.join("\n"), "utf-8")
}

processChangelog()
