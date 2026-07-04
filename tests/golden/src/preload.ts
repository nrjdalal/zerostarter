import { waitForStack } from "@/http"

// Loaded once per bun test run (bunfig.toml) so no spec races a cold stack. The per-test timeout comes from the --timeout flag in package.json.
await waitForStack()
