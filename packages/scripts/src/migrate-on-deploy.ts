import { $ } from "bun"

const env = process.env.VERCEL_ENV ?? "unset"
const ref = process.env.VERCEL_GIT_COMMIT_REF ?? "unset"

// Apply pending migrations only on deploy branches (production + canary), never on PR previews (unmerged migrations against a shared DB).
if (env !== "production" && ref !== "canary") {
  console.log(`[migrate-on-deploy] skip, VERCEL_ENV=${env}, ref=${ref}`)
  process.exit(0)
}

console.log(`[migrate-on-deploy] applying pending migrations, VERCEL_ENV=${env}, ref=${ref}`)
await $`bun run db:migrate`
console.log("[migrate-on-deploy] done")
