"use client"

import { FaDatabase } from "react-icons/fa"
import {
  SiBun,
  SiDocker,
  SiHono,
  SiNextdotjs,
  SiPostgresql,
  SiPrettier,
  SiReact,
  SiTailwindcss,
  SiTurborepo,
  SiTypescript,
  SiVercel,
  SiZod,
} from "react-icons/si"

import { BetterAuthIcon } from "../icons/better-auth-icon"
import { TanStackIcon } from "../icons/tanstack-icon"

const techStack = [
  { name: "Turborepo", icon: SiTurborepo },
  { name: "React", icon: SiReact },
  { name: "Next.js", icon: SiNextdotjs },
  { name: "Hono", icon: SiHono },
  { name: "TanStack Query", icon: TanStackIcon },
  { name: "Better Auth", icon: BetterAuthIcon },
  { name: "Tailwind CSS", icon: SiTailwindcss },
  { name: "shadcn/ui", icon: SiReact },
  { name: "Drizzle ORM", icon: FaDatabase },
  { name: "PostgreSQL", icon: SiPostgresql },
  { name: "Bun", icon: SiBun },
  { name: "Zod", icon: SiZod },
  { name: "Fumadocs", icon: SiReact },
  { name: "tsdown", icon: SiTypescript },
  { name: "Oxlint", icon: SiTypescript },
  { name: "Prettier", icon: SiPrettier },
  { name: "TypeScript", icon: SiTypescript },
  { name: "Docker", icon: SiDocker },
  { name: "Vercel", icon: SiVercel },
]

export function TechMarquee() {
  return (
    <div className="bg-muted/30 relative overflow-hidden border-t py-8">
      <div className="animate-marquee flex w-max gap-12 px-6">
        {[...techStack, ...techStack].map((tech, index) => {
          const Icon = tech.icon
          return (
            <div
              key={`${tech.name}-${index}`}
              className="text-muted-foreground hover:text-foreground flex items-center gap-2 whitespace-nowrap transition-colors"
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">{tech.name}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
