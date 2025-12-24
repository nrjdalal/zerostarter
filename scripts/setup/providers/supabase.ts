import { spawnSync } from "child_process"
import inquirer from "inquirer"
import chalk from "chalk"
import { genAlphanumericPassword } from "../utils/db-utils.js"

interface SupabaseProject {
  id: string
  name: string
  region: string
}

/**
 * Check if user is authenticated with Supabase CLI
 */
const checkSupabaseAuth = (): boolean => {
  console.log(chalk.blueBright("\nChecking Supabase authentication..."))
  const authCheckResult = spawnSync("npx", ["supabase", "orgs", "list"], {
    encoding: "utf-8",
    shell: true,
    stdio: "pipe",
  })

  if (authCheckResult.status !== 0) {
    console.log(chalk.yellowBright("Not logged in to Supabase."))
    console.log(chalk.blueBright("Launching Supabase login..."))
    spawnSync("npx", ["supabase", "login"], { stdio: "inherit", shell: true })
    return false
  }

  console.log(chalk.greenBright("✅ Already logged in to Supabase."))
  return true
}

/**
 * Get or create a Supabase organization
 */
const getOrCreateSupabaseOrg = async (): Promise<void> => {
  const orgListResult = spawnSync("npx", ["supabase", "orgs", "list"], {
    encoding: "utf-8",
    shell: true,
  })

  if (orgListResult.status !== 0) {
    console.error(chalk.red("❌ Failed to list Supabase orgs."))
    process.exit(1)
  }

  const lines = orgListResult.stdout
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)

  const sepIdx = lines.findIndex((line) => line.includes("|") && line.includes("-"))

  // No orgs exist
  if (lines.length <= sepIdx + 1) {
    console.log(chalk.yellowBright("No Supabase organizations found."))
    const { createOrg } = await inquirer.prompt([
      {
        type: "confirm",
        name: "createOrg",
        message: chalk.cyan("Would you like to create a new Supabase organization now?"),
        default: true,
      },
    ])

    if (!createOrg) {
      console.log(chalk.red("❌ Cannot continue without a Supabase organization. Exiting."))
      process.exit(1)
    }

    const { orgName } = await inquirer.prompt([
      {
        type: "input",
        name: "orgName",
        message: chalk.cyan("Enter a name for your new Supabase organization:"),
        validate: (input: string) => input && input.length > 2,
      },
    ])

    console.log(chalk.blueBright(`\nCreating Supabase organization '${orgName}'...`))
    const createOrgResult = spawnSync("npx", ["supabase", "orgs", "create", orgName], {
      stdio: "inherit",
      encoding: "utf-8",
      shell: true,
    })

    if (createOrgResult.status !== 0) {
      console.error(chalk.red("❌ Failed to create Supabase organization."))
      process.exit(1)
    }
  }
}

/**
 * Create a Supabase project and return project details
 */
const createSupabaseProject = async (
  projectName: string,
  dbPassword: string,
): Promise<{ projectId: string; region: string }> => {
  console.log(chalk.blueBright(`\nCreating Supabase project '${projectName}'...`))
  const createResult = spawnSync(
    "npx",
    ["supabase", "projects", "create", projectName, "--db-password", dbPassword],
    { stdio: "inherit", encoding: "utf-8", shell: true },
  )

  if (createResult.status !== 0) {
    console.error(chalk.red("❌ Failed to create Supabase project."))
    process.exit(1)
  }

  // List projects to get project details
  const listResult = spawnSync("npx", ["supabase", "projects", "list", "--output", "json"], {
    encoding: "utf-8",
    shell: true,
  })

  if (listResult.status !== 0) {
    console.error(chalk.red("❌ Failed to list Supabase projects."))
    process.exit(1)
  }

  const projects: SupabaseProject[] = JSON.parse(listResult.stdout)
  const found = projects.find((p) => p.name === projectName)

  if (!found) {
    console.error(chalk.red("❌ Failed to find new Supabase project."))
    process.exit(1)
  }

  return {
    projectId: found.id,
    region: found.region,
  }
}

/**
 * Main function to set up Supabase and return DATABASE_URL
 */
export const setupSupabase = async (): Promise<string> => {
  console.log(chalk.magentaBright("\n================ Supabase Setup ================\n"))

  // Check authentication
  checkSupabaseAuth()

  // Ensure org exists
  await getOrCreateSupabaseOrg()

  // Project configuration
  const { projectName } = await inquirer.prompt([
    {
      type: "input",
      name: "projectName",
      message: chalk.cyan("Enter a name for your Neon project:"),
      default: "ZeroStarter-oss-db",
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return "Project name cannot be empty"
        }
        if (input.length > 64) {
          return "Project name must be 64 characters or less"
        }
        // Neon project names should be lowercase alphanumeric with hyphens
        if (!/^[a-z0-9-]+$/.test(input)) {
          return "Project name must contain only lowercase letters, numbers, and hyphens"
        }
        return true
      },
    },
  ])
  const dbPassword = genAlphanumericPassword(24)

  // Create project
  const { projectId, region } = await createSupabaseProject(projectName, dbPassword)

  // Construct DATABASE_URL
  const databaseUrl = `postgresql://postgres.${projectId}:${dbPassword}@aws-0-${region}.pooler.supabase.com:6543/postgres`

  console.log(chalk.greenBright(`\nGenerated DB password: ${dbPassword}\n`))
  console.log(chalk.greenBright(`\nYour DATABASE_URL is:\n${databaseUrl}\n`))
  console.log(chalk.yellow("--------------------------------"))

  return databaseUrl
}
