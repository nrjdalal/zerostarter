#!/usr/bin/env bash
# Playwright webServer command: starts the whole dev stack (web :3000 + api :4000) when it is not already running.
set -euo pipefail
cd "$(dirname "$0")/../../.."
exec bunx turbo run dev --ui stream
