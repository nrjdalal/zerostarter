#!/usr/bin/env bash
# Starts the dev stack (web :3000 + api :4000) when it is not already running, then waits for both.
set -euo pipefail
cd "$(dirname "$0")/../../.."

if ! curl -sf --max-time 2 http://localhost:4000/api/health > /dev/null 2>&1; then
  echo "dev stack not running, starting it..."
  (bunx turbo run dev --ui stream > /tmp/zerostarter-dev.log 2>&1 &)
fi

curl -sf --retry 120 --retry-delay 1 --retry-connrefused --retry-all-errors http://localhost:4000/api/health > /dev/null
curl -sf --retry 120 --retry-delay 1 --retry-connrefused --retry-all-errors -o /dev/null http://localhost:3000/
echo "stack ready: web :3000, api :4000"
