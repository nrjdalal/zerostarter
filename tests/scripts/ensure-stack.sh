#!/usr/bin/env bash
# Starts the dev stack (web :3000 + api :4000) when it is not already running, then waits for both.
set -euo pipefail
cd "$(dirname "$0")/../.."

# Start the stack only if a port is not already bound. Probe "is something listening" rather than "does it respond in 2s": a slow first compile keeps the port bound, and a fast liveness check would false-negative there and spawn a second turbo that collides on 3000/4000.
listening() { lsof -nP -iTCP:"$1" -sTCP:LISTEN > /dev/null 2>&1; }
if ! listening 4000 || ! listening 3000; then
  echo "dev stack not running, starting it..."
  (bunx turbo run dev --ui stream > /tmp/zerostarter-dev.log 2>&1 &)
fi

curl -sf --retry 120 --retry-delay 1 --retry-connrefused --retry-all-errors http://localhost:4000/api/health > /dev/null
curl -sf --retry 120 --retry-delay 1 --retry-connrefused --retry-all-errors -o /dev/null http://localhost:3000/
echo "stack ready: web :3000, api :4000"
