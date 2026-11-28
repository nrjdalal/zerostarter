const CHANGELOG_PATH = "CHANGELOG.md"

async function githubGet<T>(token: string, path: string): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "changelog-manager",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  })
  if (!response.ok) throw new Error(`GET ${path}: ${response.status}`)
  return (await response.json()) as T
}

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

export async function findUsernameByEmail(
  token: string,
  email: string,
  repoOwner: string,
  repoName: string,
): Promise<string | null> {
  try {
    const commits = await githubGet<{ author: { login: string } | null }[]>(
      token,
      `/repos/${encodeURIComponent(repoOwner)}/${encodeURIComponent(repoName)}/commits?author=${encodeURIComponent(email)}&per_page=1`,
    )
    return commits[0]?.author?.login ?? null
  } catch {
    return null
  }
}

export async function getFullNameByUsername(
  token: string,
  username: string,
): Promise<string | null> {
  try {
    const user = await githubGet<{ name: string | null }>(
      token,
      `/users/${encodeURIComponent(username)}`,
    )
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

export async function processChangelog() {
  const [repoOwner, repoName] = process.env.GITHUB_REPOSITORY!.split("/")

  const content = await Bun.file(CHANGELOG_PATH).text()
  const lines = content.split("\n")

  updateCompareLinks(lines, repoOwner, repoName)

  const token = process.env.GITHUB_TOKEN
  if (!token) {
    await Bun.write(CHANGELOG_PATH, lines.join("\n"))
    return
  }

  const firstContributorSection = lines.findIndex((line) => line.trim() === "### ❤️ Contributors")

  if (firstContributorSection === -1) {
    console.log("No contributors section found")
    return
  }

  // one request at a time, as GitHub's REST best practices ask, to stay clear of secondary rate limits
  for (let i = firstContributorSection + 1; i < lines.length; i++) {
    const entry = lines[i].trim()
    if (entry.startsWith("##")) {
      break
    }
    if (!entry.startsWith("- ")) continue

    const nameMatch = entry.match(/^-\s+(.+?)(?:\s+[@<]|$)/)
    const fallbackName = nameMatch ? nameMatch[1].trim() : ""

    const { email, username: extractedUsername } = extractEmailAndUsername(entry)

    let username = extractedUsername
    if (!username && email) {
      username = await findUsernameByEmail(token, email, repoOwner, repoName)
    }

    if (username) {
      const fullName = await getFullNameByUsername(token, username)
      lines[i] = `- ${fullName || fallbackName} @${username}`
    } else {
      lines[i] = entry
    }
  }

  await Bun.write(CHANGELOG_PATH, lines.join("\n"))
}

if (import.meta.main) processChangelog()
