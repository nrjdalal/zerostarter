#!/usr/bin/env node
import pkg from "../package.json" with { type: "json" }
import { doctor } from "./commands/doctor"
import { init } from "./commands/init"
import { sync } from "./commands/sync"

const { author, name, version } = pkg

const helpMessage = `Version:
  ${name}@${version}

Scaffold a clean product from the zerostarter SaaS starter, and keep forks in
sync with upstream.

Usage:
  $ ${name} <command> [options]

Commands:
  init [dir]     Scaffold zerostarter into dir (default .), then convert it into
                 a clean product. The dir name becomes the project name.
  sync           Re-baseline an existing fork on zerostarter's latest scaffold
  doctor         Check a fork for leftover upstream branding and config gaps

Options:
  -v, --version  Display version
  -h, --help     Display help

Author:
  ${author.name} <${author.email}> (${author.url})`

const main = async () => {
  try {
    const args = process.argv.slice(2)
    const cmd = args[0]
    const rest = args.slice(1)

    switch (cmd) {
      case "init":
        return await init(rest)
      case "sync":
        return await sync(rest)
      case "doctor":
        return await doctor(rest)
      case undefined:
      case "-h":
      case "--help":
        console.log(helpMessage)
        return
      case "-v":
      case "--version":
        console.log(`${name}@${version}`)
        return
      default:
        console.error(`Unknown command: ${cmd}\n`)
        console.log(helpMessage)
        process.exit(1)
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

main()
