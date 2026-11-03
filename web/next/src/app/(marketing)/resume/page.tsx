import { site } from "@packages/config/site"
import { RiArrowRightUpLine } from "@remixicon/react"
import { cn } from "cn"
import type { Metadata } from "next"
import Link from "next/link"

import { config } from "@/lib/config"
import { caveat, lora } from "@/lib/marketing/fonts"

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
  "**Agent orchestration**: Claude Code sessions that plan, build, review and merge software, run from one live dashboard",
  "**Guardrails for agents**: guard hooks that refuse unsafe actions, and a review step before every merge",
  "**AI product engineering**: LLM workflows taken from prototype to production, and agent tooling that takes structured actions for users",
  "**Fast, steady delivery**: a product that ships daily, with a median under three hours from opening a change to merging it",
  "**Type-safe full stack**: shared types from database to UI in TypeScript, React, Next.js, Hono and Bun",
  "**Build speed and release automation**: test suites about 5x faster, CI gates, and promotion between environments without hand-made pull requests",
  "**Security by default**: two-step sign-in for every account in ten days, and a production image with zero critical or high vulnerabilities",
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
      "Brought the production image to **zero critical and high vulnerabilities**, from more than fifty, and made it a fifth smaller, proving the app byte-identical across the change and adding a CI gate so a regression fails the build.",
      "Made the team's **test suites about 5x faster** and cold builds about 4x faster by moving the build and test toolchain to a faster compiler over one weekend, unasked, and turned a flaky out-of-memory coverage job into a stable one in under half the time.",
      "Kept delivery fast at a median of **under three hours** from opening a change to merging it, with 19 in 20 changes merged the same day.",
      "**Automated the path to production** and the team's dev tooling: changes labelled by area, promotion between environments without hand-made pull requests, a faster monorepo build, CI results in chat, and a same-day fix that unblocked every change in the repo.",
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
      "Built Playground, an **agent factory** where Claude Code sessions plan, build, review, and merge software, with a live dashboard of every session and guard hooks that refuse unsafe actions.",
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
    group: "AI",
    items:
      "**Claude Code** (hooks, skills, multi-session orchestration), **Claude Agent SDK**, **MCP**, Vercel AI SDK, OpenAI Agents SDK, OpenAI API, **LLM-as-judge evals**, agent tooling (AGENTS.md, skills)",
  },
  { group: "Languages", items: "**TypeScript**, JavaScript, **Python**, **SQL**, Bash, HTML/CSS" },
  {
    group: "Web & UI",
    items:
      "**React**, **Next.js** (App Router), **TanStack** Router/Query/Form, **Tailwind CSS**, shadcn/ui, Radix, React Hook Form, Zod, MDX, i18n, SSR/SSG, PWA, Accessibility, Web Vitals",
  },
  {
    group: "Backend & APIs",
    items:
      "**Node.js**, **Bun**, **Hono** (+ RPC), NestJS, Express, Elysia, tRPC, **FastAPI**, SQLAlchemy, REST, OpenAPI/Scalar, WebSockets, Better Auth, MFA and OAuth flows, queues, rate limiting, caching",
  },
  {
    group: "Databases",
    items: "**PostgreSQL**, **Drizzle ORM**, Prisma, MongoDB, **Redis** (Upstash)",
  },
  {
    group: "Cloud & Infra",
    items:
      "**AWS** (Lambda, EC2, S3, RDS, SQS, SES, CloudFront, API Gateway, IAM), **Kubernetes**, SST + Pulumi, Cloudflare Workers, **Vercel**, **Docker** and image CVE hygiene, nginx, headless browsers on Lambda",
  },
  {
    group: "Tooling & Quality",
    items:
      "**Turborepo**, Nx, Bun/pnpm workspaces, SWC, tsdown/tsup, oxlint/oxfmt, **GitHub Actions** (OIDC publishing), conventional commits, changesets, lefthook, **Vitest**, pytest, **Playwright**, PostHog",
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
          production SaaS, developer tools, full-stack TypeScript systems, and{" "}
          <b className="font-semibold">AI agent infrastructure</b>. At LightWork AI I ship product
          end to end on an AI-powered property-management platform: frontend, backend, dev tooling,
          migrations, security, infrastructure, and AI agent tooling. On my own time I build an
          open-source <b className="font-semibold">agent factory</b>: Claude Code sessions that
          plan, build, review and merge software. Author of 100+ public repositories with 1,070+
          GitHub stars and 30,000+ weekly npm downloads, used by projects including Storybook,
          TanStack Router, and ElectricSQL.{" "}
          <span className={cn(lora.className, "font-medium tracking-wide italic")}>
            I learn by shipping, and I sweat build performance, type safety, and release automation.
          </span>
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
      </div>

      {/* core strengths */}
      <div className="container mx-auto max-w-3xl space-y-8 px-4 md:px-6">
        <h2 className={sectionHeading}>core strengths</h2>
        <ul className="text-muted-foreground list-disc space-y-1 pl-5">
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
            <ul className="text-muted-foreground list-disc space-y-1 pl-5">
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
          1,070+ stars across{" "}
          <a
            href="https://github.com/nrjdalal"
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            100+ public repositories
          </a>
          , and 30,000+ weekly npm downloads across 40+ packages. The strongest:
        </p>
        <ul className="text-muted-foreground list-disc space-y-1 pl-5">
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
        <ul className="text-muted-foreground list-disc space-y-1 pl-5">
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
