import { site } from "@packages/config/site"
import {
  RiArrowRightLine,
  RiBookOpenLine,
  RiDatabase2Line,
  RiGitForkLine,
  RiGithubFill,
  RiGlobalLine,
  RiGroupLine,
  RiHeartFill,
  RiLockLine,
  RiRobot2Line,
  RiRocketLine,
  RiShieldKeyholeLine,
  RiSpeedLine,
  RiStackLine,
} from "@remixicon/react"
import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"
import { codeToHtml } from "shiki"

import { ApiStatus } from "@/components/api-status"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Tech = { name: string; icon: { light: string; dark: string } }

export const techStack: Tech[] = [
  {
    name: "Base UI",
    icon: { light: "/landing/base-ui-light.svg", dark: "/landing/base-ui-dark.svg" },
  },
  {
    name: "Better Auth",
    icon: { light: "/landing/better-auth-light.svg", dark: "/landing/better-auth-dark.svg" },
  },
  { name: "Bun", icon: { light: "/landing/bun.svg", dark: "/landing/bun.svg" } },
  { name: "Docker", icon: { light: "/landing/docker.svg", dark: "/landing/docker.svg" } },
  {
    name: "Drizzle ORM",
    icon: { light: "/landing/drizzle-orm-light.svg", dark: "/landing/drizzle-orm-dark.svg" },
  },
  { name: "Fumadocs", icon: { light: "/landing/fumadocs.png", dark: "/landing/fumadocs.png" } },
  { name: "Hono", icon: { light: "/landing/hono.svg", dark: "/landing/hono.svg" } },
  { name: "Next.js", icon: { light: "/landing/nextjs.svg", dark: "/landing/nextjs.svg" } },
  { name: "Oxc", icon: { light: "/landing/oxc.svg", dark: "/landing/oxc.svg" } },
  {
    name: "PostgreSQL",
    icon: { light: "/landing/postgresql.svg", dark: "/landing/postgresql.svg" },
  },
  { name: "PostHog", icon: { light: "/landing/posthog.svg", dark: "/landing/posthog.svg" } },
  { name: "React", icon: { light: "/landing/react-light.svg", dark: "/landing/react-dark.svg" } },
  {
    name: "shadcn/ui",
    icon: { light: "/landing/shadcn-ui-light.svg", dark: "/landing/shadcn-ui-dark.svg" },
  },
  {
    name: "Tailwind CSS",
    icon: { light: "/landing/tailwindcss.svg", dark: "/landing/tailwindcss.svg" },
  },
  {
    name: "TanStack Query",
    icon: { light: "/landing/tanstack.svg", dark: "/landing/tanstack.svg" },
  },
  { name: "tsdown", icon: { light: "/landing/tsdown.svg", dark: "/landing/tsdown.svg" } },
  {
    name: "Turborepo",
    icon: { light: "/landing/turborepo-light.svg", dark: "/landing/turborepo-dark.svg" },
  },
  {
    name: "TypeScript",
    icon: { light: "/landing/typescript.svg", dark: "/landing/typescript.svg" },
  },
  {
    name: "Vercel",
    icon: { light: "/landing/vercel-light.svg", dark: "/landing/vercel-dark.svg" },
  },
  { name: "Zod", icon: { light: "/landing/zod.svg", dark: "/landing/zod.svg" } },
]

const featureCards = [
  {
    icon: RiLockLine,
    title: "Auth & organizations",
    description:
      "GitHub and Google OAuth, secure sessions, organizations, teams, and admin roles wired through Better Auth.",
  },
  {
    icon: RiDatabase2Line,
    title: "Database & migrations",
    description:
      "PostgreSQL and Drizzle on Bun's SQL driver, with migrations generated locally and applied automatically on Vercel deploys.",
  },
  {
    icon: RiShieldKeyholeLine,
    title: "Role-gated console",
    description:
      "A protected /console area powered by the Better Auth admin plugin. Access control is handled; the product surface is yours.",
  },
  {
    icon: RiSpeedLine,
    title: "Rate-limited API",
    description:
      "Production-ready limits by IP, user, or API key, with Arcjet IP detection and environment-driven defaults.",
  },
  {
    icon: RiGroupLine,
    title: "Multi-tenant, day one",
    description:
      "Organizations, teams, roles, invitations, and active-org switching are built into the dashboard from the first run.",
  },
  {
    icon: RiGlobalLine,
    title: "Dynamic OG & SEO",
    description:
      "takumi social cards, sitemap, robots, and metadata are already wired, so every page ships indexable by default.",
  },
]

const whyPoints = [
  {
    icon: RiStackLine,
    title: "Minimal footprint, maximum leverage",
    description:
      "No spare layers, no framework soup, no speculative complexity. Every package earns its place; every boundary has a job.",
  },
  {
    icon: RiRocketLine,
    title: "Automation from PR to release",
    description:
      "Checks, changelogs, versioning, and releases run through repeatable workflows, so shipping does not depend on memory.",
  },
  {
    icon: RiGitForkLine,
    title: "Centralized where it matters",
    description:
      "Brand, env, auth, schema, and build config live in one place each. Change it once and the whole system stays aligned.",
  },
  {
    icon: RiBookOpenLine,
    title: "Docs as part of the product",
    description:
      "Structured docs, generated API reference, and llms.txt ship with the code, so onboarding works for humans and agents alike.",
  },
]

const shikiReset =
  "[&_pre]:m-0! [&_pre]:overflow-visible! [&_pre]:bg-transparent! [&_pre]:p-0! [&_pre]:font-mono! [&_pre]:text-sm!"

function CodeWindow({ label, html }: { label: string; html: string }) {
  return (
    <div className="bg-card min-w-0 overflow-hidden rounded-lg border text-left shadow-sm">
      <div className="bg-muted/40 flex items-center gap-2 border-b px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden>
          <span className="bg-muted-foreground/25 size-3 rounded-full" />
          <span className="bg-muted-foreground/25 size-3 rounded-full" />
          <span className="bg-muted-foreground/25 size-3 rounded-full" />
        </span>
        <span className="text-muted-foreground ml-1.5 font-mono text-xs">{label}</span>
      </div>
      <div
        className={cn("overflow-x-auto p-5", shikiReset, "[&_pre]:leading-relaxed!")}
        dangerouslySetInnerHTML={{ __html: html }}
        style={{ colorScheme: "light dark" }}
      />
    </div>
  )
}

function CodeCard({ html }: { html: string }) {
  return (
    <div
      className={cn(
        "bg-background flex min-w-0 flex-col justify-center overflow-x-auto rounded-lg border p-4",
        shikiReset,
        "[&_pre]:leading-loose!",
      )}
      dangerouslySetInnerHTML={{ __html: html }}
      style={{ colorScheme: "light dark" }}
    />
  )
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="bg-muted/50 text-muted-foreground mb-4 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm">
      <span className="bg-success size-1.5 rounded-full" aria-hidden />
      {children}
    </span>
  )
}

export default async function Home() {
  const initCode = `bunx zerostarter init
bun run dev   # web :3000 · api :4000`

  const typescriptCode = `import { apiClient, unwrap } from "@/lib/api/client"

// fully typed { data, error }
const { data, error } = await unwrap(
  apiClient.health.$get(),
)`

  const agentCode = `# sign an agent in, drive the app
agent-browser open http://localhost:3000
agent-browser snapshot   # read the UI
agent-browser click "@e5"   # act`

  const deployCode = `# two Vercel projects, one database
vercel --prod

# or the whole stack, anywhere
docker compose up --build`

  const highlight = (code: string, lang: "typescript" | "bash") =>
    codeToHtml(code, {
      lang,
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
    })

  const [initHtml, typescriptHtml, agentHtml, deployHtml] = await Promise.all([
    highlight(initCode, "bash"),
    highlight(typescriptCode, "typescript"),
    highlight(agentCode, "bash"),
    highlight(deployCode, "bash"),
  ])

  return (
    <main className="flex flex-col">
      {/* Hero */}
      <section aria-label="Hero" className="flex min-h-svh flex-col">
        <div className="flex flex-1 flex-col justify-center px-4 py-24 text-center md:px-6">
          <div>
            <Link
              href="/docs"
              className="bg-muted/50 text-muted-foreground hover:bg-muted mx-auto mb-8 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors"
            >
              <span className="bg-success size-1.5 rounded-full" aria-hidden />
              Open source, MIT licensed, production-ready by default
              <RiArrowRightLine className="size-3.5" />
            </Link>
            <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-balance sm:text-5xl md:text-6xl">
              {/* non-breaking hyphens so "world-class" never splits across lines */}
              {site.tagline.replaceAll("-", "‑")}
            </h1>
            <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg text-balance sm:text-xl">
              {site.name} gives you the architecture, practices, automation, and documentation
              behind a clean SaaS codebase, so humans and agents can ship faster without creating
              chaos.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                role="link"
                size="lg"
                className="h-11 px-6"
                render={<a href={site.social.github} target="_blank" rel="noopener noreferrer" />}
              >
                <RiGithubFill className="size-5" />
                Start with {site.name}
              </Button>
              <Button
                role="link"
                size="lg"
                variant="outline"
                className="group h-11 px-6"
                render={<Link href="/docs" />}
              >
                Read the docs
                <RiArrowRightLine className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </div>
            <div className="mt-10 flex justify-center">
              <ApiStatus />
            </div>
            <div className="mx-auto mt-6 max-w-2xl">
              <CodeWindow label="Quick Start" html={initHtml} />
            </div>
          </div>
        </div>

        {/* Tech stack, pinned to the bottom of the hero */}
        <div className="bg-muted/30 relative overflow-hidden py-6">
          <div className="animate-marquee flex w-max gap-10 px-6">
            {[...techStack, ...techStack].map((tech, index) => (
              <div
                key={`${tech.name}-${index}`}
                className="text-muted-foreground flex items-center gap-2 whitespace-nowrap"
              >
                <span className="relative size-4 shrink-0">
                  <Image
                    src={tech.icon.light}
                    alt={tech.name}
                    fill
                    sizes="1rem"
                    className="block dark:hidden"
                  />
                  <Image
                    src={tech.icon.dark}
                    alt={tech.name}
                    fill
                    sizes="1rem"
                    className="hidden dark:block"
                  />
                </span>
                <span className="text-sm font-medium">{tech.name}</span>
              </div>
            ))}
          </div>
          <div className="from-background pointer-events-none absolute inset-y-0 left-0 w-24 bg-linear-to-r to-transparent" />
          <div className="from-background pointer-events-none absolute inset-y-0 right-0 w-24 bg-linear-to-l to-transparent" />
          <style
            dangerouslySetInnerHTML={{
              __html: `@keyframes marquee{from{transform:translate3d(0,0,0)}to{transform:translate3d(-50%,0,0)}}.animate-marquee{animation:marquee 50s linear infinite;will-change:transform}`,
            }}
          />
        </div>
      </section>

      {/* Type safety */}
      <section aria-label="Type safety" className="px-4 py-24 text-center md:px-6">
        <Eyebrow>Type safety</Eyebrow>
        <h2 className="mx-auto text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          One contract from database to UI
        </h2>
        <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg text-balance">
          Hono RPC exposes your API as a single{" "}
          <code className="text-foreground font-mono">AppType</code>, so the client infers every
          request and response automatically. Rename a route and the frontend stops compiling. No
          codegen. No duplicated types. No drift.
        </p>
        <div className="mx-auto mt-9 max-w-2xl">
          <CodeWindow label="web/next/src/lib/api/client.ts" html={typescriptHtml} />
        </div>
      </section>

      {/* Features bento */}
      <section aria-label="What's wired" className="px-4 py-24 md:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <Eyebrow>Infrastructure included</Eyebrow>
            <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              Wired together, not just installed
            </h2>
            <p className="text-muted-foreground mt-4 text-lg text-balance">
              The boring, critical pieces every serious SaaS needs are already connected and working
              on first run. The dashboard and console ship as auth-gated shells, ready for your
              product logic.
            </p>
          </div>
          <div className="grid gap-3.5 sm:grid-cols-2">
            {/* Agents, full-width row */}
            <div className="bg-muted/40 relative grid items-stretch gap-6 overflow-hidden rounded-lg border p-6 sm:col-span-2 sm:grid-cols-2">
              <RiRobot2Line
                aria-hidden
                className="text-foreground/[0.02] pointer-events-none absolute -bottom-8 left-5 size-32"
              />
              <div className="relative">
                <RiRobot2Line className="text-muted-foreground size-5" />
                <h3 className="mt-3.5 text-lg font-semibold">Human-readable. Agent-ready.</h3>
                <p className="text-muted-foreground mt-1.5 text-base">
                  SKILL.md playbooks, AGENTS.md, and generated llms.txt give Claude Code, Cursor,
                  and Copilot the repo-specific context they need. A dev-only login and
                  agent-browser let agents operate the real app behind auth. No mocks.
                </p>
                <div className="mt-3.5 flex flex-wrap gap-2">
                  {["SKILL.md", "llms.txt", "AGENTS.md"].map((chip) => (
                    <span
                      key={chip}
                      className="text-muted-foreground bg-background rounded border px-2 py-1 font-mono text-xs"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
              <CodeCard html={agentHtml} />
            </div>

            {featureCards.slice(0, 2).map((feature) => (
              <div
                key={feature.title}
                className="bg-muted/40 relative overflow-hidden rounded-lg border p-6"
              >
                <feature.icon
                  aria-hidden
                  className="text-foreground/[0.02] pointer-events-none absolute -bottom-8 left-5 size-32"
                />
                <div className="relative">
                  <feature.icon className="text-muted-foreground size-5" />
                  <h3 className="mt-3.5 text-lg font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground mt-1.5 text-base">{feature.description}</p>
                </div>
              </div>
            ))}

            {/* Deploy, full-width row */}
            <div className="bg-muted/40 relative grid items-stretch gap-6 overflow-hidden rounded-lg border p-6 sm:col-span-2 sm:grid-cols-2">
              <RiRocketLine
                aria-hidden
                className="text-foreground/[0.02] pointer-events-none absolute -bottom-8 left-5 size-32"
              />
              <div className="relative">
                <RiRocketLine className="text-muted-foreground size-5" />
                <h3 className="mt-3.5 text-lg font-semibold">Deploy without assembly</h3>
                <p className="text-muted-foreground mt-1.5 text-base">
                  Web and API deploy as two apps sharing one PostgreSQL database, with production
                  and Docker configs included from the first commit. On Vercel, the API runs
                  migrations during deploy.
                </p>
                <div className="mt-3.5 flex flex-wrap gap-2">
                  {(
                    [
                      {
                        name: "Vercel",
                        icon: {
                          light: "/landing/vercel-light.svg",
                          dark: "/landing/vercel-dark.svg",
                        },
                      },
                      {
                        name: "Docker",
                        icon: { light: "/landing/docker.svg", dark: "/landing/docker.svg" },
                      },
                      {
                        name: "PostgreSQL",
                        icon: { light: "/landing/postgresql.svg", dark: "/landing/postgresql.svg" },
                      },
                    ] satisfies Tech[]
                  ).map((tech) => (
                    <span
                      key={tech.name}
                      className="text-muted-foreground bg-background inline-flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-xs"
                    >
                      <span className="relative size-3 shrink-0">
                        <Image
                          src={tech.icon.light}
                          alt=""
                          fill
                          sizes="0.75rem"
                          className="block dark:hidden"
                        />
                        <Image
                          src={tech.icon.dark}
                          alt=""
                          fill
                          sizes="0.75rem"
                          className="hidden dark:block"
                        />
                      </span>
                      {tech.name}
                    </span>
                  ))}
                </div>
              </div>
              <CodeCard html={deployHtml} />
            </div>

            {featureCards.slice(2).map((feature) => (
              <div
                key={feature.title}
                className="bg-muted/40 relative overflow-hidden rounded-lg border p-6"
              >
                <feature.icon
                  aria-hidden
                  className="text-foreground/[0.02] pointer-events-none absolute -bottom-8 left-5 size-32"
                />
                <div className="relative">
                  <feature.icon className="text-muted-foreground size-5" />
                  <h3 className="mt-3.5 text-lg font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground mt-1.5 text-base">{feature.description}</p>
                </div>
              </div>
            ))}

            {/* Docs, full-width row */}
            <div className="bg-muted/40 relative grid items-center gap-6 overflow-hidden rounded-lg border p-6 sm:col-span-2 sm:grid-cols-2">
              <RiBookOpenLine
                aria-hidden
                className="text-foreground/[0.02] pointer-events-none absolute -bottom-8 left-5 size-32"
              />
              <div className="relative">
                <RiBookOpenLine className="text-muted-foreground size-5" />
                <h3 className="mt-3.5 text-lg font-semibold">Docs agents can read</h3>
                <p className="text-muted-foreground mt-1.5 text-base">
                  Fumadocs, full-text search, MDX content, and generated llms.txt make the project
                  readable for developers, contributors, and coding agents.
                </p>
              </div>
              <div className="relative flex flex-col gap-2 font-mono text-sm">
                {[
                  { route: "/docs", note: "full-text search" },
                  { route: "/blog", note: "MDX" },
                  { route: "/llms-full.txt", note: "generated" },
                ].map((row) => (
                  <a
                    key={row.route}
                    href={row.route}
                    className="bg-background hover:bg-muted/50 flex justify-between rounded-md border px-3.5 py-2.5 transition-colors"
                  >
                    {row.route}
                    <span className="text-muted-foreground">{row.note}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why ZeroStarter */}
      <section aria-label={`Why ${site.name}`} className="px-4 py-24 md:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <Eyebrow>Why {site.name}</Eyebrow>
            <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              Not another starter. A better default.
            </h2>
            <p className="text-muted-foreground mt-4 text-lg text-balance">
              Most starters give you folders and dependencies. {site.name} gives you the operating
              practices behind a production-grade codebase: shaped architecture, clear boundaries,
              centralized decisions, and workflows that keep the system clean as it grows. You do
              not just clone code; you inherit a way of building.
            </p>
          </div>
          <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2">
            {whyPoints.map((point) => (
              <div key={point.title} className="flex gap-4">
                <point.icon aria-hidden className="text-muted-foreground mt-0.5 size-6 shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold">{point.title}</h3>
                  <p className="text-muted-foreground mt-1.5 text-base">{point.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section aria-label="Call to action" className="px-4 py-24 md:px-6">
        <div className="bg-muted/40 mx-auto max-w-6xl rounded-2xl border px-6 py-16 text-center sm:py-20">
          <div className="mx-auto max-w-xl">
            <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              Start at zero. Ship like you have done this before.
            </h2>
            <p className="text-muted-foreground mt-4 text-lg text-balance">
              {site.name} is the foundation for building real SaaS products with speed, clarity, and
              discipline: production-ready infrastructure, clean architecture, automated workflows,
              and documentation both humans and agents can trust. It does not choose your payments
              or email vendor; the parts that make your product yours stay yours.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                role="link"
                size="lg"
                className="h-11 px-6"
                render={<a href={site.social.github} target="_blank" rel="noopener noreferrer" />}
              >
                <RiGithubFill className="size-5" />
                Start with {site.name}
              </Button>
              <Button
                role="link"
                size="lg"
                variant="outline"
                className="group h-11 px-6"
                render={<Link href="/docs" />}
              >
                Read the docs
                <RiArrowRightLine className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </div>
            <p className="text-muted-foreground mt-6 text-sm">
              MIT licensed. Use it freely, including for commercial products.
            </p>
          </div>
        </div>
      </section>

      <div className="border-t">
        <p className="text-muted-foreground mx-auto flex max-w-6xl items-center justify-center gap-1.5 px-4 py-5 text-sm md:px-6">
          <RiHeartFill className="size-4 fill-red-500/70 text-red-500/70" />
          Made by{" "}
          <a
            href={site.social.x}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground font-medium transition-colors"
          >
            @nrjdalal
          </a>
        </p>
      </div>
    </main>
  )
}
