import inquirer from "inquirer"
import chalk from "chalk"
import { select } from "@inquirer/prompts"
import { setupSupabase } from "./providers/supabase.js"
import { setupNeon } from "./providers/neon.js"
// import { setupRailway } from "./providers/railway.js"
import { setupLocalDocker } from "./providers/local-docker.js"
import { setupRailway } from "./providers/railway-pg.js"

/**
 * Handle manual DATABASE_URL input
 */
const setupManual = async (): Promise<string> => {
  const { databaseUrl } = await inquirer.prompt([
    {
      type: "input",
      name: "databaseUrl",
      message: "Paste in your DATABASE_URL:",
      validate: (input: string) => {
        if (!input || input.length < 5) {
          return "Please enter a valid DATABASE_URL"
        }
        if (!input.startsWith("postgres://") && !input.startsWith("postgresql://")) {
          return "DATABASE_URL should start with postgres:// or postgresql://"
        }
        return true
      },
    },
  ])
  return databaseUrl
}

/**
 * Main database setup handler
 */
export async function handleDatabaseSetup(): Promise<string> {
  console.log(chalk.magentaBright("\n================ Database Setup ================\n"))

  const provider = await select({
    message: "Choose your PostgreSQL provider:",
    default: "supabase",
    choices: [
      { name: "Supabase (Cloud)", value: "supabase" },
      { name: "Neon (Serverless)", value: "neon" },
      { name: "Railway", value: "railway" },
      { name: "Local PostgreSQL (Docker)", value: "local" },
      { name: "I already have a DATABASE_URL", value: "manual" },
      { name: "I'll configure later", value: "later" },
    ],
  })

  console.log(chalk.blueBright(`\nSelected: ${provider}\n`))

  switch (provider) {
    case "supabase":
      return await setupSupabase()
    case "neon":
      return await setupNeon()
    case "railway":
      return await setupRailway()
    case "local":
      return await setupLocalDocker()
    case "manual":
      return await setupManual()
    case "later":
      console.log(
        chalk.yellowBright(
          "\n⚠️  Skipping database setup. Remember to add DATABASE_URL to .env later!",
        ),
      )
      return ""
    default:
      return ""
  }
}
