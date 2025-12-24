import { spawnSync } from "child_process"
import { select, input } from "@inquirer/prompts"
import chalk from "chalk"

interface NeonProject {
  id: string
  name: string
  region_id: string
  pg_version: number
}

interface NeonBranch {
  id: string
  project_id: string
  name: string
}

interface NeonDatabase {
  id: number
  branch_id: string
  name: string
  owner_name: string
}

interface NeonRole {
  branch_id: string
  name: string
  password: string
}

interface NeonConnectionUri {
  connection_uri: string
}

/**
 * Check if user is authenticated with Neon CLI
 */
const checkNeonAuth = (): boolean => {
  console.log(chalk.blueBright("\nChecking Neon authentication..."))
  const authCheckResult = spawnSync("npx", ["neonctl", "me"], {
    encoding: "utf-8",
    shell: true,
    stdio: "pipe",
  })

  if (authCheckResult.status !== 0) {
    console.log(chalk.yellowBright("Not logged in to Neon."))
    console.log(chalk.blueBright("\nTo authenticate with Neon:"))
    console.log(chalk.cyan("A link will appear below - please click it to authenticate.\n"))

    const authResult = spawnSync("npx", ["neonctl", "auth"], {
      stdio: "inherit",
      shell: true,
    })

    if (authResult.status !== 0) {
      console.log(chalk.red("\n❌ Authentication failed. Please try again."))
      console.log(chalk.yellow("If the browser didn't open, copy and paste the link from above."))
      process.exit(1)
    }

    // Verify authentication was successful
    const verifyResult = spawnSync("npx", ["neonctl", "me"], {
      encoding: "utf-8",
      shell: true,
      stdio: "pipe",
    })

    if (verifyResult.status !== 0) {
      console.log(chalk.red("\n❌ Authentication verification failed."))
      console.log(chalk.yellow("Please run 'npx neonctl auth' manually and try again."))
      process.exit(1)
    }

    console.log(chalk.greenBright("\n✅ Successfully authenticated with Neon!"))
    return true
  }

  console.log(chalk.greenBright("✅ Already logged in to Neon."))
  return true
}

/**
 * Get available regions
 * Note: neonctl doesn't have a regions list command, so we return the known available regions
 */
const getAvailableRegions = (): Array<{ name: string; value: string }> => {
  // All supported Neon regions as of 2025
  // Reference: https://neon.tech/docs/introduction/regions
  return [
    // AWS Regions
    { name: "🇺🇸 AWS US East (N. Virginia)", value: "aws-us-east-1" },
    { name: "🇺🇸 AWS US East (Ohio)", value: "aws-us-east-2" },
    { name: "🇺🇸 AWS US West (Oregon)", value: "aws-us-west-2" },
    { name: "🇩🇪 AWS Europe (Frankfurt)", value: "aws-eu-central-1" },
    { name: "🇬🇧 AWS Europe (London)", value: "aws-eu-west-2" },
    { name: "🇸🇬 AWS Asia Pacific (Singapore)", value: "aws-ap-southeast-1" },
    { name: "🇦🇺 AWS Asia Pacific (Sydney)", value: "aws-ap-southeast-2" },
    { name: "🇧🇷 AWS South America (São Paulo)", value: "aws-sa-east-1" },
    // Azure Regions
    { name: "🇺🇸 Azure East US 2 (Virginia)", value: "azure-eastus2" },
    { name: "🇺🇸 Azure West US 3 (Arizona)", value: "azure-westus3" },
    { name: "🇩🇪 Azure Germany West Central (Frankfurt)", value: "azure-gwc" },
  ]
}

/**
 * Create a Neon project and return project details
 */
const createNeonProject = async (
  projectName: string,
  region: string,
): Promise<{ projectId: string; region: string }> => {
  console.log(chalk.blueBright(`\nCreating Neon project '${projectName}'...`))
  console.log(chalk.cyan("You may be prompted to select an organization."))
  console.log(
    chalk.yellowBright(
      "💡 Tip: When asked 'use this organization by default?', select 'yes' for smoother setup.\n",
    ),
  )

  // Create the project with table output first (interactive)
  const createResult = spawnSync(
    "npx",
    ["neonctl", "projects", "create", "--name", projectName, "--region-id", region],
    {
      encoding: "utf-8",
      shell: true,
      stdio: "inherit", // Fully interactive
    },
  )

  if (createResult.status !== 0) {
    console.error(chalk.red("\n❌ Failed to create Neon project."))
    process.exit(1)
  }

  console.log(chalk.blueBright("\n\nFetching project details..."))

  // Now get the project details - also interactive in case org wasn't set as default
  const listResult = spawnSync("npx", ["neonctl", "projects", "list", "--output", "json"], {
    encoding: "utf-8",
    shell: true,
    stdio: "inherit", // Changed to inherit to allow interactive org selection if needed
  })

  if (listResult.status !== 0) {
    console.error(chalk.red("❌ Failed to list projects."))
    process.exit(1)
  }

  // Since we used inherit, we need to run the command again with pipe to get the JSON
  const listResult2 = spawnSync("npx", ["neonctl", "projects", "list", "--output", "json"], {
    encoding: "utf-8",
    shell: true,
    stdio: "pipe",
  })

  if (listResult2.status !== 0) {
    console.error(chalk.red("❌ Failed to fetch project data."))
    console.error(chalk.red(listResult2.stderr))
    process.exit(1)
  }

  try {
    const output = listResult2.stdout.trim()

    // The output should now be clean JSON since org is set as default
    // But still handle the case where there might be extra output
    const jsonMatch = output.match(/\[[\s\S]*\]/)

    if (!jsonMatch) {
      console.error(chalk.red("❌ Could not find JSON array in projects list."))
      console.error(chalk.yellow("Raw stdout:"), output)
      process.exit(1)
    }

    const projects: NeonProject[] = JSON.parse(jsonMatch[0])

    // Find the project we just created by name
    const project = projects.find((p) => p.name === projectName)

    if (!project) {
      console.error(chalk.red(`❌ Could not find project '${projectName}' in the list.`))
      console.error(chalk.yellow("Available projects:"), projects.map((p) => p.name).join(", "))
      process.exit(1)
    }

    console.log(chalk.greenBright(`✅ Project created successfully: ${project.id}`))

    return {
      projectId: project.id,
      region: project.region_id,
    }
  } catch (error) {
    console.error(chalk.red("❌ Failed to parse project list."))
    console.error(chalk.red("Error details:"), error)
    console.error(chalk.yellow("\nRaw stdout:"), listResult2.stdout)
    console.error(chalk.yellow("\nRaw stderr:"), listResult2.stderr)
    process.exit(1)
  }
}

/**
 * Get the default branch for a project
 */
const getDefaultBranch = (projectId: string): string => {
  const branchResult = spawnSync(
    "npx",
    ["neonctl", "branches", "list", "--project-id", projectId, "--output", "json"],
    { encoding: "utf-8", shell: true, stdio: "pipe" },
  )

  if (branchResult.status !== 0) {
    console.error(chalk.red("❌ Failed to get branches."))
    process.exit(1)
  }

  try {
    const branches: NeonBranch[] = JSON.parse(branchResult.stdout)
    const mainBranch = branches.find((b) => b.name === "main")

    if (!mainBranch) {
      console.error(chalk.red("❌ Could not find main branch."))
      process.exit(1)
    }

    return mainBranch.id
  } catch (error) {
    console.error(chalk.red("❌ Failed to parse branches."))
    process.exit(1)
  }
}

/**
 * Get connection string for the project
 */
const getConnectionString = (projectId: string, branchId: string, roleName: string): string => {
  const connResult = spawnSync(
    "npx",
    [
      "neonctl",
      "connection-string",
      "--project-id",
      projectId,
      "--branch-id",
      branchId,
      "--role-name",
      roleName,
      "--pooled",
    ],
    {
      encoding: "utf-8",
      shell: true,
      stdio: "pipe",
    },
  )

  if (connResult.status !== 0) {
    console.error(chalk.red("❌ Failed to get connection string."))
    console.error(chalk.red(connResult.stderr))
    process.exit(1)
  }

  const output = connResult.stdout.trim()

  // ✅ Case 1: Raw connection string (most common)
  if (output.startsWith("postgresql://")) {
    return output
  }

  // ✅ Case 2: JSON output
  try {
    const parsed = JSON.parse(output)

    if (parsed.connection_uri) {
      return parsed.connection_uri
    }

    if (parsed.connection_uris?.length > 0) {
      return parsed.connection_uris[0].connection_uri
    }
  } catch {
    // ignore and fall through
  }

  console.error(chalk.red("❌ Unable to extract connection string."))
  console.error(chalk.yellow("Raw output:\n"), output)
  process.exit(1)
}

/**
 * Main function to set up Neon and return DATABASE_URL
 */
export const setupNeon = async (): Promise<string> => {
  console.log(chalk.magentaBright("\n================ Neon Setup ================\n"))

  // Check authentication
  checkNeonAuth()

  // Get available regions
  const regions = getAvailableRegions()

  // Use select for region choice
  const selectedRegion = await select({
    message: chalk.cyan("Choose your Neon region:"),
    default: "aws-us-east-2",
    choices: regions,
  })

  // Project configuration
  const projectName = await input({
    message: chalk.cyan("Enter a name for your Neon project:"),
    default: "ZeroStarter-oss-db",
    validate: (inputValue: string) => {
      if (!inputValue || inputValue.trim().length === 0) {
        return "Project name cannot be empty"
      }
      if (inputValue.length > 64) {
        return "Project name must be 64 characters or less"
      }
      // Neon project names should be lowercase alphanumeric with hyphens
      if (!/^[a-z0-9-]+$/.test(inputValue)) {
        return "Project name must contain only lowercase letters, numbers, and hyphens"
      }
      return true
    },
  })

  // Create project
  const { projectId, region } = await createNeonProject(projectName, selectedRegion)

  // Get the default branch
  const branchId = getDefaultBranch(projectId)

  // Get connection string (uses default role 'neondb_owner')
  const databaseUrl = getConnectionString(projectId, branchId, "neondb_owner")

  console.log(chalk.greenBright(`\n✅ Neon project created successfully!`))
  console.log(chalk.greenBright(`Project ID: ${projectId}`))
  console.log(chalk.greenBright(`Region: ${region}`))
  console.log(chalk.greenBright(`\nYour DATABASE_URL is:\n${databaseUrl}\n`))
  console.log(chalk.yellow("--------------------------------"))

  return databaseUrl
}
