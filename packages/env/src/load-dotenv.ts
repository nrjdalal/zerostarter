// The repo keeps one .env at its root, which no runtime finds on its own, so every server entrypoint that validates env imports this first. It stays apart from getSafeEnv on purpose: web-next.ts is imported by client components, and sharing a module with it would drag dotenv, node:path and the whole browserified node graph onto every page.
import path from "node:path"

import { config } from "dotenv"

import { NODE_ENV } from "@/lib/constants"

if (typeof window === "undefined") {
  try {
    // Load base .env file
    const envPath = path.resolve(process.cwd(), "../../.env")
    config({ path: envPath, quiet: true })

    // Load environment-specific .env file if NODE_ENV is set
    const nodeEnv = process.env.NODE_ENV
    if (nodeEnv && NODE_ENV.safeParse(nodeEnv).success) {
      const envSpecificPath = path.resolve(process.cwd(), `../../.env.${nodeEnv}`)
      config({ path: envSpecificPath, override: true, quiet: true })
    }
  } catch (e) {
    console.error(e)
  }
}
