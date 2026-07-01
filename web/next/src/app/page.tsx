import { site } from "@packages/config/site"
import {
  RiArrowRightLine,
  RiBookOpenLine,
  RiCheckboxCircleFill,
  RiCodeLine,
  RiCursorLine,
  RiDatabase2Line,
  RiFileCodeLine,
  RiFileTextLine,
  RiGitBranchLine,
  RiGithubFill,
  RiGlobalLine,
  RiGroupLine,
  RiHeartFill,
  RiLockLine,
  RiRocketLine,
  RiShieldKeyholeLine,
  RiSpeedLine,
} from "@remixicon/react"
import Image from "next/image"
import Link from "next/link"
import { codeToHtml } from "shiki"

import { ApiStatus } from "@/components/api-status"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
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

const leanClaims = [
  "0 runtime deps at the root",
  "one Rust toolchain, no ESLint or Prettier",
  "one-file rebrand",
  "strict types, database to UI",
]

const agentFlow = [
  {
    icon: RiFileCodeLine,
    title: "Executable skills",
    description:
      "SKILL.md recipes (api-endpoint, db-migration, dev) hand an agent the exact steps and traps for this repo, so it works first try.",
  },
  {
    icon: RiCursorLine,
    title: "Drives the real app",
    description:
      "A bundled agent-browser skill plus a dev-only Login (agents) button let an agent operate the running product behind auth. No mocks.",
  },
  {
    icon: RiFileTextLine,
    title: "llms.txt, generated",
    description:
      "/llms.txt and /llms-full.txt emit the whole codebase as context, so an agent writes correct code without crawling the tree.",
  },
  {
    icon: RiGitBranchLine,
    title: "Docs that can't drift",
    description:
      "AGENTS.md makes docs-in-sync a rule and skills self-reconcile, so what the agent reads is always what the code does.",
  },
]

const features = [
  {
    icon: RiCodeLine,
    title: "Type-safe API",
    description:
      "Hono RPC. The frontend infers what the backend returns; breaking changes fail at compile time.",
  },
  {
    icon: RiLockLine,
    title: "Auth & organizations",
    description:
      "Better Auth with GitHub and Google OAuth, sessions, organizations, teams, and an admin role.",
  },
  {
    icon: RiDatabase2Line,
    title: "Database & migrations",
    description:
      "PostgreSQL and Drizzle on Bun's SQL driver, with generated migrations that apply on deploy.",
  },
  {
    icon: RiShieldKeyholeLine,
    title: "Role-gated console",
    description:
      "An admin area at /console behind the Better Auth admin plugin. The gate is real; the page is yours.",
  },
  {
    icon: RiSpeedLine,
    title: "Rate-limited API",
    description:
      "Built-in limits keyed per IP, user, or API key, with Arcjet IP detection and env-driven defaults.",
  },
  {
    icon: RiGlobalLine,
    title: "Dynamic OG & SEO",
    description:
      "takumi social cards for every page, plus sitemap, robots, and metadata. Indexable by default.",
  },
  {
    icon: RiBookOpenLine,
    title: "Docs, blog & llms.txt",
    description:
      "Fumadocs with full-text search and a generated llms.txt. Human-readable and machine-readable at once.",
  },
  {
    icon: RiGroupLine,
    title: "Multi-tenant, day one",
    description:
      "Organizations, teams, member roles, invitations, and an active-org switcher wired into the dashboard.",
  },
  {
    icon: RiRocketLine,
    title: "Two apps, one deploy",
    description:
      "web and api ship as two apps on one database, on Vercel or Docker Compose (Vercel migrates on deploy).",
  },
]

function CodeWindow({ label, html }: { label: string; html: string }) {
  return (
    <div className="bg-card min-w-0 overflow-hidden rounded-xl border shadow-sm">
      <div className="bg-muted/40 flex items-center gap-2 border-b px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden>
          <span className="bg-muted-foreground/25 size-3 rounded-full" />
          <span className="bg-muted-foreground/25 size-3 rounded-full" />
          <span className="bg-muted-foreground/25 size-3 rounded-full" />
        </span>
        <span className="text-muted-foreground ml-1.5 font-mono text-xs">{label}</span>
      </div>
      <div
        className={cn(
          "overflow-x-auto p-5",
          "[&_pre]:m-0! [&_pre]:overflow-visible! [&_pre]:bg-transparent! [&_pre]:p-0! [&_pre]:font-mono! [&_pre]:text-sm! [&_pre]:leading-relaxed!",
        )}
        dangerouslySetInnerHTML={{ __html: html }}
        style={{ colorScheme: "light dark" }}
      />
    </div>
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

  const agentCode = `# scaffold, start the stack, sign an agent in
bunx zerostarter init
bun run dev

agent-browser open http://localhost:3000
agent-browser snapshot     # read the UI
agent-browser click "@e5"      # act on a ref`

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
      <section
        aria-label="Hero"
        className="relative flex min-h-svh flex-col overflow-hidden border-b"
      >
        <div className="pointer-events-none absolute inset-x-0 top-[57px] bottom-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] mask-[radial-gradient(ellipse_70%_55%_at_50%_0%,black,transparent)] bg-size-[36px_36px] opacity-40" />
        <div className="relative container mx-auto flex max-w-5xl flex-1 flex-col justify-center px-4 py-20 text-center md:px-6">
          <Link
            href="/docs"
            className="bg-muted/50 text-muted-foreground hover:bg-muted mx-auto mb-8 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors"
          >
            <span className="bg-success size-1.5 rounded-full" />
            Production-grade, type-safe, and open source
            <RiArrowRightLine className="size-3.5" />
          </Link>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            The production-grade SaaS starter for{" "}
            <span className="whitespace-nowrap">AI and humans</span>
          </h1>
          <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg text-balance">
            A strictly-typed Bun + Turborepo monorepo, wired end to end and small enough to read.
            The production plumbing is done, so you start on features.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              role="link"
              size="lg"
              className="h-11 px-6"
              render={<a href={site.social.github} target="_blank" rel="noopener noreferrer" />}
            >
              <RiGithubFill className="size-5" />
              Get {site.name}
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
          <div className="mx-auto mt-12 max-w-2xl text-left">
            <CodeWindow label="Terminal" html={initHtml} />
          </div>
          <div className="mt-6 flex justify-center">
            <ApiStatus />
          </div>
        </div>

        {/* Stack marquee */}
        <div className="bg-muted/30 relative overflow-hidden border-t py-6">
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

      {/* Type safety: text + code, two columns */}
      <section aria-label="Type safety" className="border-b py-24">
        <div className="container mx-auto grid max-w-6xl items-center gap-12 px-4 md:px-6 lg:grid-cols-2">
          <div>
            <p className="text-muted-foreground mb-3 font-mono text-sm">Type safety</p>
            <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              One type, from the database to the UI
            </h2>
            <p className="text-muted-foreground mt-4 text-lg">
              Hono RPC exports your whole API as a single{" "}
              <code className="text-foreground">AppType</code>, and the client infers every request
              and response from it. Rename a route and the frontend stops compiling: a red squiggle
              in your editor, not a 500 in production.
            </p>
            <p className="text-muted-foreground mt-4">
              No codegen. No hand-written types. No drift.
            </p>
          </div>
          <CodeWindow label="web/next/src/lib/api/client.ts" html={typescriptHtml} />
        </div>
      </section>

      {/* Lean codebase: centered, with claim strip */}
      <section aria-label="A codebase you can read" className="bg-muted/30 border-b py-24">
        <div className="container mx-auto max-w-3xl px-4 text-center md:px-6">
          <p className="text-muted-foreground mb-3 font-mono text-sm">Minimal by design</p>
          <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            A codebase you can hold in your head
          </h2>
          <p className="text-muted-foreground mt-4 text-lg text-balance">
            Most starters bury you in scaffolding before you write a line of your own. This one is
            small enough to read end to end, so there's less to learn, less to maintain, and less
            for anyone, human or agent, to get wrong.
          </p>
        </div>
        <div className="bg-border container mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-px overflow-hidden rounded-xl border sm:grid-cols-2 lg:grid-cols-4">
          {leanClaims.map((claim) => (
            <div key={claim} className="bg-card p-5">
              <RiCheckboxCircleFill className="text-success mb-2.5 size-5" />
              <p className="text-sm font-medium">{claim}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Agents: code + text, two columns */}
      <section aria-label="Built for agents" className="border-b py-24">
        <div className="container mx-auto grid max-w-6xl items-center gap-12 px-4 md:px-6 lg:grid-cols-2">
          <div className="lg:order-2">
            <p className="text-muted-foreground mb-3 font-mono text-sm">Agent-ready</p>
            <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              Legible enough that agents build here
            </h2>
            <p className="text-muted-foreground mt-4 text-lg">
              A small, typed codebase is one an AI agent can actually reason about, so {site.name}{" "}
              leans in. Point Claude Code or Cursor at it and it ships a real feature, typed, so a
              wrong call fails at compile time.
            </p>
          </div>
          <div className="min-w-0 lg:order-1">
            <CodeWindow label="Terminal" html={agentHtml} />
          </div>
        </div>
        <div className="container mx-auto mt-14 grid max-w-6xl gap-4 px-4 sm:grid-cols-2 md:px-6 lg:grid-cols-4">
          {agentFlow.map((item) => (
            <div
              key={item.title}
              className="bg-card hover:border-foreground/20 rounded-xl border p-5 transition-colors"
            >
              <item.icon className="text-muted-foreground mb-3 size-5" />
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-muted-foreground mt-1.5 text-sm">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section aria-label="What's wired" className="bg-muted/30 border-b py-24">
        <div className="container mx-auto max-w-6xl px-4 md:px-6">
          <div className="max-w-2xl">
            <p className="text-muted-foreground mb-3 font-mono text-sm">Batteries included</p>
            <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              Wired, not just installed
            </h2>
            <p className="text-muted-foreground mt-4 text-lg">
              Every capability below works out of the box, so you and your agents start on features
              instead of plumbing. The dashboard and console ship as auth-gated shells, ready for
              yours.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-card hover:border-foreground/20 rounded-xl border p-5 transition-colors"
              >
                <div className="mb-2.5 flex items-center gap-2.5">
                  <feature.icon className="text-muted-foreground size-5 shrink-0" />
                  <h3 className="font-semibold">{feature.title}</h3>
                </div>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Deploy */}
      <section aria-label="Deploy" className="border-b py-24">
        <div className="container mx-auto grid max-w-6xl items-center gap-12 px-4 md:px-6 lg:grid-cols-2">
          <div>
            <p className="text-muted-foreground mb-3 font-mono text-sm">Ship it</p>
            <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              Two apps, one database, minutes to deploy
            </h2>
            <p className="text-muted-foreground mt-4 text-lg">
              web and api deploy as two apps sharing one PostgreSQL database, with production and
              Docker configs from the first commit. The API applies pending migrations on deploy.
            </p>
            <Button
              role="link"
              variant="outline"
              className="group mt-6"
              render={<Link href="/docs/deployment/vercel" />}
            >
              Deployment guides
              <RiArrowRightLine className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
          <CodeWindow label="Terminal" html={deployHtml} />
        </div>
      </section>

      {/* FAQ */}
      <section aria-label="FAQ" className="bg-muted/30 border-b py-24">
        <div className="container mx-auto max-w-3xl px-4 md:px-6">
          <h2 className="mb-10 text-center text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Questions
          </h2>
          <Accordion className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-left hover:no-underline">
                What is {site.name}?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                A strictly-typed SaaS starter built as a Bun + Turborepo monorepo. It ships the
                load-bearing parts of a SaaS (auth, organizations, a type-safe API, a database with
                migrations, docs, and deploy) on a codebase small enough to read end to end and
                extend without fighting it.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-left hover:no-underline">
                How is it different from other starters?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Most starters hand you a pile of features and a codebase you'll never fully read.{" "}
                {site.name} optimizes for the opposite: a small, legible, end-to-end-typed base with
                zero root dependencies and a single toolchain, so you and your agents start from
                something you actually understand.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-left hover:no-underline">
                How does it help AI agents?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Because the code is small and typed, an agent can reason about it. On top of that:
                executable skills that encode the repo's conventions, a one-request local sign-in
                for testing behind auth, agent-browser to drive the running app, and generated
                llms.txt for full context.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger className="text-left hover:no-underline">
                Is it production-ready?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                The infrastructure is: auth, orgs and teams, the role gate, rate limiting,
                migrations, OG images, SEO, and Docker/Vercel deploy are wired and working. The
                dashboard and console are deliberately left as auth-gated shells, a starting point
                for your features, not a pre-filled product.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5">
              <AccordionTrigger className="text-left hover:no-underline">
                Can I use it commercially?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes. {site.name} is MIT licensed. Use it for anything, including commercial
                products, and build as many projects with it as you like.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section aria-label="Call to action" className="py-24">
        <div className="container mx-auto max-w-5xl px-4 md:px-6">
          <div className="bg-muted/30 relative overflow-hidden rounded-2xl border px-6 py-16 text-center sm:py-20">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] mask-[radial-gradient(ellipse_60%_80%_at_50%_0%,black,transparent)] bg-size-[36px_36px] opacity-40" />
            <div className="relative mx-auto max-w-xl">
              <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                Start from something you can read
              </h2>
              <p className="text-muted-foreground mt-4 text-lg text-balance">
                Scaffold {site.name} in one command and begin from a base you actually understand.
                Your product on day one, not your plumbing.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  role="link"
                  size="lg"
                  className="h-11 px-6"
                  render={<a href={site.social.github} target="_blank" rel="noopener noreferrer" />}
                >
                  <RiGithubFill className="size-5" />
                  Get {site.name}
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
            </div>
          </div>
          <p className="text-muted-foreground mt-8 flex items-center justify-center gap-1.5 text-sm">
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
      </section>
    </main>
  )
}
