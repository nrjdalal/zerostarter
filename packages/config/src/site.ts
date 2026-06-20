// Brand identity for this app: the single source a fork edits to rebrand. web reads it via lib/config.ts.
export const site = {
  name: "ZeroStarter",
  description:
    "A modern, type-safe, and high-performance SaaS starter template built with a monorepo architecture.",
  tagline: "The SaaS Starter",
  social: {
    github: "https://github.com/nrjdalal/zerostarter",
    x: "https://x.com/nrjdalal",
    discord: "https://discord.gg/38FeAUmHSZ",
  },
  // Local-only dev agent identity (api/hono agents router).
  agent: {
    name: "AgentZero",
    email: "agent@zerostarter.dev",
  },
} as const

export type Site = typeof site
