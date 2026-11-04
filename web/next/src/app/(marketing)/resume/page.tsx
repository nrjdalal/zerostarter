import { site } from "@packages/config/site"
import { RiArrowRightUpLine, RiDownloadLine } from "@remixicon/react"
import { cn } from "cn"
import type { Metadata } from "next"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { config } from "@/lib/config"
import { caveat } from "@/lib/marketing/fonts"

const ogImageUrl = `${config.app.url}/og?${new URLSearchParams({
  section: "Résumé",
  title: "Neeraj Dalal",
  description: "AI-native engineer & SaaS architect",
}).toString()}`

export const metadata: Metadata = {
  title: "Résumé - Neeraj Dalal",
  description:
    "AI-native Product Engineer building SaaS, developer tools, and AI agent infrastructure. Experience, projects, skills.",
  openGraph: {
    type: "website",
    siteName: site.name,
    url: `${config.app.url}/resume`,
    images: [{ url: ogImageUrl, width: 1200, height: 630, alt: "Neeraj Dalal - Résumé" }],
  },
  twitter: { card: "summary_large_image", images: [ogImageUrl] },
}

const strengths = [
  "**Open-source agent infrastructure**: built ZeroStarter, a type-safe SaaS starter that AI agents can operate, and on its foundation Playground, a multi-agent system where Claude Code sessions plan, build, review and ship software under policies I define",
  "**AI product engineering**: LLM workflows taken from prototype to production, and agent tooling that takes structured actions for users",
  "**Migrations without regressions**: a framework re-platform, a full redesign shipped behind flags and a move into a new codebase, each landed on a live product with no feature freeze",
  "**Build and release automation**: CI gates, test toolchains and promotion between environments without hand-made pull requests",
  "**Security by default**: authentication and access control built in and rolled out to every account of a live product",
]

const experience: {
  company: string
  role: string
  meta: string
  href?: string
  points: string[]
}[] = [
  {
    company: "LightWork AI",
    role: "Product Engineer",
    meta: "London, UK (Remote) · Jun 2025 – Present",
    href: "https://lightwork.co",
    points: [
      "Shipped product **end to end for a year and a half**, across frontend, backend, dev tooling, migrations, security, infrastructure, and AI agent tooling, on an AI-powered property-management platform that ships daily.",
      "Made two-step sign-in **mandatory for every account in ten days**, building both the server side and the UI: email codes, Google sign-in, trusted devices, a real password policy, lockout, and per-organisation controls, rolled out to every existing account.",
      "Made the team's **test suites about 5x faster** and cold builds about 4x faster by moving the build and test toolchain to a faster compiler over one weekend, unasked, and turned a flaky out-of-memory coverage job into a stable one in under half the time.",
      "Automated **the path to production** and the team's dev tooling: changes labelled by area, promotion between environments without hand-made pull requests, a faster monorepo build, CI results in chat, and a same-day fix that unblocked every change in the repo.",
      "Built **AI agent tooling** that lets the product take structured actions on behalf of users.",
      "Led the web app's migrations: a framework re-platform in my first month, a full redesign shipped to every page behind flags with no feature freeze, the old UI retired in a single cutover with **zero regressions**, and the move into a new codebase.",
      "Took the product from **one language to four in two days**, with an automated parity check so no language can drift and no growth in bundle size.",
    ],
  },
  {
    company: "Open source (ZeroStarter, Playground)",
    role: "Creator & Maintainer",
    meta: "Remote · Nov 2025 – Present",
    points: [
      "Built ZeroStarter, a **type-safe SaaS starter**: shared types from database to UI, one database schema, automated publishing, and an agent sign-in so AI agents can operate the app.",
      "Built Playground as a ZeroStarter fork: an **agent factory** on Claude Code, skills, MCP tools and the Claude Agent SDK, where sessions plan, build, review, and merge software from a live dashboard, with policy-driven guardrails.",
      "Both are public on GitHub; ZeroStarter installs with one command and stands at **64★**.",
    ],
  },
  {
    company: "Stealth AI Startup",
    role: "Product Engineer",
    meta: "Oct 2023 – May 2025",
    points: [
      "Early product engineer building a new AI product from **0 to 1** across the full stack.",
      "Built frontend and backend features **end to end**, from product UI through APIs, data, and deployment.",
      "Integrated **LLM workflows** into the core experience, turning AI prototypes into production capabilities.",
      "Helped define the product's **early technical foundation** as part of a small engineering team.",
    ],
  },
  {
    company: "Warewe",
    role: "Senior Developer",
    meta: "New Delhi · Sep 2022 – Sep 2023",
    points: [
      "Built Hetrolinks, a SaaS for repairing broken Amazon affiliate links: engineered AWS Lambda as rotating proxies to bypass captcha for **~90% proxy-cost savings**, plus a scraper covering 2,000+ pages in 5-10 min.",
      "Re-architected the backend from Python to Node.js on AWS Lambda for **~50% better performance**, with queueing and rate limiting for concurrent jobs.",
      "Built **SerpWe end to end**: ran Puppeteer on Lambda over thousands of Google results, clustered keywords by SERP overlap to infer search intent, and wrote 100% of the Next.js admin dashboard.",
    ],
  },
  {
    company: "VeroXyle",
    role: "Full-Stack Developer",
    meta: "New Delhi · May 2020 – Aug 2022",
    points: [
      "Delivered and maintained **10+ client-facing web projects** across frontend and backend.",
      "Automated CI/CD pipelines (**~40% faster deploys**) and built nginx/Certbot deploy and server-management tooling that cut infra costs ~20%.",
      "Standardized API patterns across projects, improving development turnaround **~30%**.",
    ],
  },
  {
    company: "SSIM Dwarka",
    role: "Intern",
    meta: "New Delhi · Nov 2019 – Apr 2020",
    points: ["Built, deployed, and managed the website for the institute."],
  },
]

const projects: { name: string; href: string; note: string }[] = [
  {
    name: "gitpick (326★)",
    href: "https://github.com/nrjdalal/gitpick",
    note: "TypeScript, Bun. A zero-dependency degit replacement that clones any file, folder, or branch by URL: **345,000 npm downloads in the last year**; used by Storybook, TanStack Router, ElectricSQL, and Alchemy.",
  },
  {
    name: "tailwind-animate",
    href: "https://github.com/nrjdalal/tailwind-animate",
    note: "TypeScript. A Tailwind CSS v4 animation plugin replacing tailwindcss-animate: **24,000 weekly npm downloads**.",
  },
  {
    name: "rdt.li (252★)",
    href: "https://github.com/nrjdalal/rdt-li",
    note: "Next.js, Drizzle, Postgres. A self-hostable, open-source URL shortener with analytics, charts, and **one-click deploy**.",
  },
  {
    name: "shadcn-ui snippets (117★)",
    href: "https://github.com/nrjdalal/shadcn-ui-snippets",
    note: "VS Code, Bun. An editor extension for shadcn/ui snippets, **13,500+ installs** across its two Marketplace listings, built via a Markdown-to-snippet pipeline.",
  },
  {
    name: "smart-registry (27★)",
    href: "https://github.com/nrjdalal/smart-registry",
    note: "TypeScript. A **zero-config** shadcn registry builder that auto-detects files and dependencies, removing most registry.json boilerplate.",
  },
  {
    name: "karabiner-human-config (51★)",
    href: "https://github.com/nrjdalal/karabiner-human-config",
    note: "TypeScript. A human-readable Karabiner config compiler, **listed among the official Karabiner-Elements generators**.",
  },
]

const skills: { group: string; items: string }[] = [
  {
    group: "AI & agents",
    items:
      "**Claude Code** (hooks, skills, AGENTS.md), **Claude Agent SDK**, **MCP** servers (GitHub, Linear, Slack, Notion, Datadog, PostHog), Vercel AI SDK, **agent-browser** and agent-desktop automation, multi-session orchestration, LLM-as-judge review gates",
  },
  {
    group: "Languages & frameworks",
    items:
      "**TypeScript**, JavaScript, Python, SQL, Bash; **React**, **Next.js** (App Router), **Hono** (RPC, OpenAPI with Scalar), **Bun**, Node.js, **Tailwind CSS**, shadcn/ui, Base UI, TanStack Query/Form/Table, Zod, Streamdown, Fumadocs, MDX, WebSockets",
  },
  {
    group: "Data & auth",
    items:
      "**PostgreSQL**, **Drizzle ORM**, **Redis**, **Better Auth**, OAuth and two-step sign-in flows, rate limiting, queues",
  },
  {
    group: "Infra & tooling",
    items:
      "**Docker**, **Vercel**, AWS Lambda, **GitHub Actions** (OIDC npm publishing), **Turborepo**, Bun workspaces, tsdown, oxlint/oxfmt, lefthook, conventional commits, automated changelogs, bun test with browser-driven end-to-end tests, PostHog",
  },
]

const sectionHeading = `${caveat.className} text-muted-foreground text-3xl font-bold tracking-wide`
const linkClass = "border-border hover:border-ring border-b transition-colors"

// A **phrase** in a bullet renders bold; the text between markers stays plain.
const emphasize = (text: string) =>
  text.split("**").map((part, index) =>
    index % 2 === 1 ? (
      <b key={`${index}-${part}`} className="text-foreground font-semibold">
        {part}
      </b>
    ) : (
      part
    ),
  )

export default function Page() {
  return (
    <main className="bg-background text-foreground min-h-svh space-y-16 py-24 text-base">
      {/* header */}
      <div className="container mx-auto max-w-3xl space-y-8 px-4 md:px-6">
        <h1 className={cn(caveat.className, "text-3xl font-bold tracking-wide")}>résumé</h1>
        <p className="text-lg">
          <b className="font-semibold">AI-native Product Engineer</b> with 6+ years shipping
          production SaaS and <b className="font-semibold">AI agent infrastructure</b> in full-stack
          TypeScript. At LightWork AI, I help build an AI-powered property-management platform
          across the full stack: agents, UI and infrastructure. On my own time I build{" "}
          <b className="font-semibold">ZeroStarter</b>, an open-source type-safe SaaS starter, and
          on top of it an <b className="font-semibold">agent factory</b> where Claude Code sessions
          ship software. Author of 250+ repositories, with 1,070+ GitHub stars and 30,000+ weekly
          npm downloads.
        </p>
        <p className="text-muted-foreground text-sm">
          New Delhi, India (open to relocate) ·{" "}
          <a href="mailto:nrjdalal.dev@gmail.com" className={linkClass}>
            nrjdalal.dev@gmail.com
          </a>{" "}
          ·{" "}
          <a
            href="https://github.com/nrjdalal"
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            github.com/nrjdalal
          </a>{" "}
          ·{" "}
          <a
            href="https://linkedin.com/in/nrjdalal"
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            linkedin.com/in/nrjdalal
          </a>
        </p>
        <Button
          variant="outline"
          size="sm"
          className="print:hidden"
          render={<a href="/neeraj-dalal-resume.pdf" download="Neeraj Dalal - Resume.pdf" />}
        >
          <RiDownloadLine />
          Download PDF
        </Button>
      </div>

      {/* core strengths */}
      <div className="container mx-auto max-w-3xl space-y-8 px-4 md:px-6">
        <h2 className={sectionHeading}>core strengths</h2>
        <ul className="text-muted-foreground list-disc space-y-2 pl-5 leading-snug">
          {strengths.map((s) => (
            <li key={s}>{emphasize(s)}</li>
          ))}
        </ul>
      </div>

      {/* experience */}
      <div className="container mx-auto max-w-3xl space-y-8 px-4 md:px-6">
        <h2 className={sectionHeading}>experience</h2>
        {experience.map((job) => (
          <div key={job.company} className="space-y-2">
            <p>
              <b className="font-semibold">{job.role}</b> ·{" "}
              {job.href ? (
                <a href={job.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {job.company}
                </a>
              ) : (
                job.company
              )}{" "}
              <span className="text-muted-foreground">· {job.meta}</span>
            </p>
            <ul className="text-muted-foreground list-disc space-y-2 pl-5 leading-snug">
              {job.points.map((point) => (
                <li key={point}>{emphasize(point)}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* selected projects */}
      <div className="container mx-auto max-w-3xl space-y-8 px-4 md:px-6">
        <h2 className={sectionHeading}>selected projects</h2>
        <p className="text-muted-foreground">
          <a
            href="https://github.com/nrjdalal"
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            250+ repositories
          </a>
          , 1,070+ GitHub stars on the public ones, and 30,000+ weekly npm downloads across 40+
          packages. The strongest:
        </p>
        <ul className="text-muted-foreground list-disc space-y-2 pl-5 leading-snug">
          {projects.map((project) => (
            <li key={project.name}>
              <a
                href={project.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground border-border hover:border-ring border-b font-semibold transition-colors"
              >
                {project.name}
              </a>
              <RiArrowRightUpLine className="text-muted-foreground mb-1 inline size-4" /> -{" "}
              {emphasize(project.note)}
            </li>
          ))}
        </ul>
      </div>

      {/* skills */}
      <div className="container mx-auto max-w-3xl space-y-8 px-4 md:px-6">
        <h2 className={sectionHeading}>skills</h2>
        <ul className="text-muted-foreground list-disc space-y-2 pl-5 leading-snug">
          {skills.map((skill) => (
            <li key={skill.group}>
              <span className="text-foreground font-medium">{skill.group}</span>:{" "}
              {emphasize(skill.items)}
            </li>
          ))}
        </ul>
      </div>

      {/* education */}
      <div className="container mx-auto max-w-3xl space-y-8 px-4 md:px-6">
        <h2 className={sectionHeading}>education</h2>
        <div className="space-y-2">
          <p>
            <b className="font-semibold">B.Tech, Electronics &amp; Communication Engineering</b>
          </p>
          <p className="text-muted-foreground">
            <b className="text-foreground font-semibold">Delhi Technical Campus (GGSIPU)</b>, New
            Delhi · 2016–2020
          </p>
        </div>
      </div>

      {/* the story behind the work: site navigation, kept off the printed page */}
      <div className="container mx-auto max-w-3xl space-y-8 px-4 md:px-6 print:hidden">
        <h2 className={sectionHeading}>the story behind the work</h2>
        <p className="text-muted-foreground">
          This is the clean version. The real one is messier and more useful: 250 repositories, six
          years of learning in public, and the path from shell scripts to systems like ZeroStarter,
          release automation, and AI-agent infrastructure. Read it if you want to understand how I
          think, not just what I shipped:{" "}
          <Link href="/blog/a-biography-written-in-code" className={linkClass}>
            A Biography Written in Code
          </Link>
          . Or head{" "}
          <Link href="/hire" className={linkClass}>
            back home
          </Link>
          .
        </p>
      </div>
    </main>
  )
}
