import { site } from "@packages/config/site"
import { RiArrowRightUpLine } from "@remixicon/react"
import type { Metadata } from "next"
import Link from "next/link"

import { config } from "@/lib/config"
import { caveat, newsreader } from "@/lib/fonts"

const ogImageUrl = `${config.app.url}/og?${new URLSearchParams({
  section: "Résumé",
  title: "Neeraj Dalal",
  description: "AI-native engineer & SaaS architect",
}).toString()}`

export const metadata: Metadata = {
  title: "Résumé — Neeraj Dalal",
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
  "AI product engineering and agent tooling",
  "Full-stack SaaS architecture and type-safe TypeScript systems",
  "React, Next.js, TanStack, Hono, Bun",
  "Developer tools, CLIs, VS Code extensions, open source",
  "AWS Lambda, serverless systems, queues, rate limiting",
  "Scraping infrastructure and browser automation",
  "Monorepos, CI/CD, release automation",
  "0-to-1 product development in startup environments",
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
      "Shipped 500+ pull requests across frontend, backend, infrastructure, and product workflows on an AI-powered property-management platform.",
      "Built AI agent tooling that lets the product take structured actions on behalf of users.",
      "Led a major frontend redesign across core product surfaces, delivered incrementally behind feature flags.",
      "Implemented internationalization across the redesigned product flows.",
      "Improved build performance, CI reliability, and developer-experience tooling across the engineering team.",
    ],
  },
  {
    company: "Stealth AI Startup",
    role: "Product Engineer",
    meta: "Oct 2023 – May 2025",
    points: [
      "Early product engineer building a new AI product from 0 to 1 across the full stack.",
      "Built frontend and backend features end to end, from product UI through APIs, data, and deployment.",
      "Integrated LLM workflows into the core experience, turning AI prototypes into production capabilities.",
      "Helped define the product's early technical foundation as part of a small engineering team.",
    ],
  },
  {
    company: "Warewe",
    role: "Senior Developer",
    meta: "New Delhi · Sep 2022 – Sep 2023",
    points: [
      "Built Hetrolinks, a SaaS for repairing broken Amazon affiliate links: engineered AWS Lambda as rotating proxies to bypass captcha for ~90% proxy-cost savings, plus a scraper covering 2,000+ pages in 5-10 min.",
      "Re-architected the backend from Python to Node.js on AWS Lambda for ~50% better performance, with queueing and rate limiting for concurrent jobs.",
      "Built SerpWe end to end: ran Puppeteer on Lambda over thousands of Google results, clustered keywords by SERP overlap to infer search intent, and wrote 100% of the Next.js admin dashboard.",
    ],
  },
  {
    company: "VeroXyle",
    role: "Full-Stack Developer",
    meta: "New Delhi · May 2020 – Aug 2022",
    points: [
      "Delivered and maintained 10+ client-facing web projects across frontend and backend.",
      "Automated CI/CD pipelines (~40% faster deploys) and built nginx/Certbot deploy and server-management tooling that cut infra costs ~20%.",
      "Standardized API patterns across projects, improving development turnaround ~30%.",
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
    name: "gitpick (311★)",
    href: "https://github.com/nrjdalal/gitpick",
    note: "TypeScript, Bun. A zero-dependency degit replacement that clones any file, folder, or branch by URL; used by TanStack Router, SST, Electric SQL, and Storybook.",
  },
  {
    name: "zerostarter (52★)",
    href: "https://github.com/nrjdalal/zerostarter",
    note: "Bun, Hono RPC, Better Auth, Drizzle, TanStack. A type-safe SaaS monorepo with shared types, one database schema, and self-healing release automation.",
  },
  {
    name: "rdt.li (255★)",
    href: "https://github.com/nrjdalal/rdt-li",
    note: "Next.js, Drizzle, Postgres. A self-hostable, open-source URL shortener with analytics, charts, and one-click deploy.",
  },
  {
    name: "shadcn-ui snippets (117★)",
    href: "https://github.com/nrjdalal/shadcn-ui-snippets",
    note: "VS Code, Bun. An editor extension for shadcn/ui snippets, 8,500+ installs, built via a Markdown-to-snippet pipeline.",
  },
  {
    name: "smart-registry (27★)",
    href: "https://github.com/nrjdalal/smart-registry",
    note: "TypeScript. A zero-config shadcn registry builder that auto-detects files and dependencies, removing most registry.json boilerplate.",
  },
  {
    name: "onset (62★)",
    href: "https://github.com/nrjdalal/onset",
    note: "Next.js, Drizzle, Auth.js. A documented full-stack starter that teaches the architecture step by step.",
  },
  {
    name: "karabiner-human-config (46★)",
    href: "https://github.com/nrjdalal/karabiner-human-config",
    note: "TypeScript. A human-readable Karabiner config compiler, listed among the official Karabiner-Elements generators.",
  },
]

const skills: { group: string; items: string }[] = [
  { group: "Languages", items: "TypeScript, JavaScript, SQL, Python, Bash, HTML/CSS" },
  {
    group: "Frontend",
    items:
      "React, Next.js (App Router), TanStack Router/Query/Form, Tailwind CSS, shadcn/ui, Radix, React Hook Form, Zod, MDX, SSR/SSG, PWA, Accessibility, Web Vitals",
  },
  {
    group: "Backend & APIs",
    items:
      "Node.js, Bun, Hono (+ RPC), NestJS, Express, Elysia, tRPC, REST, OpenAPI/Scalar, WebSockets, Better Auth, queues, rate limiting, caching",
  },
  { group: "Databases", items: "PostgreSQL, Drizzle ORM, Prisma, MongoDB, Redis (Upstash)" },
  {
    group: "AI",
    items: "Vercel AI SDK, OpenAI Agents SDK, OpenAI API, agent tooling (AGENTS.md, skills)",
  },
  {
    group: "Cloud & Infra",
    items:
      "AWS (Lambda, EC2, S3, RDS, SQS, SES, CloudFront, API Gateway, IAM), SST + Pulumi, Cloudflare Workers, Vercel, Docker, nginx, headless browsers on Lambda",
  },
  {
    group: "Tooling & Quality",
    items:
      "Turborepo, Bun/pnpm workspaces, tsdown/tsup, oxlint/oxfmt, GitHub Actions (OIDC publishing), conventional commits, changesets, lefthook, Vitest, Playwright, PostHog",
  },
]

const sectionHeading = `${caveat.className} text-muted-foreground text-3xl font-semibold tracking-wide`
const linkClass = "border-border hover:border-ring border-b transition-colors"

export default function Page() {
  return (
    <div className="bg-background text-foreground min-h-screen space-y-16 py-36 text-base">
      {/* header */}
      <div className="container mx-auto max-w-3xl space-y-8 px-5">
        <h1 className={`${caveat.className} text-3xl font-semibold tracking-wide`}>résumé</h1>
        <p className="text-lg">
          AI-native Product Engineer with 5+ years shipping production SaaS, developer tools,
          full-stack TypeScript systems, and AI agent infrastructure. Currently building AI-powered
          product surfaces and agent tooling at LightWork AI. Author of 250+ public repositories and
          open-source tools with 1,045+ GitHub stars, used by projects including TanStack, SST,
          Electric SQL, and Storybook.{" "}
          <span className={`${newsreader.className} font-medium tracking-wide italic`}>
            I learn by shipping, and I sweat build performance, type safety, and release automation.
          </span>
        </p>
        <p className="text-muted-foreground text-sm">
          New Delhi, India ·{" "}
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
      <div className="container mx-auto max-w-3xl space-y-8 px-5">
        <h2 className={sectionHeading}>core strengths</h2>
        <ul className="text-muted-foreground list-disc space-y-1 pl-5">
          {strengths.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>

      {/* experience */}
      <div className="container mx-auto max-w-3xl space-y-8 px-5">
        <h2 className={sectionHeading}>experience</h2>
        {experience.map((job) => (
          <div key={job.company} className="space-y-2">
            <p>
              {job.role} ·{" "}
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
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* selected projects */}
      <div className="container mx-auto max-w-3xl space-y-8 px-5">
        <h2 className={sectionHeading}>selected projects</h2>
        <p className="text-muted-foreground">
          1,045+ stars across{" "}
          <a
            href="https://github.com/nrjdalal"
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            ~250 public repositories
          </a>
          . The strongest:
        </p>
        <ul className="text-muted-foreground list-disc space-y-1 pl-5">
          {projects.map((project) => (
            <li key={project.name}>
              <a
                href={project.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground border-border hover:border-ring border-b transition-colors"
              >
                {project.name}
              </a>
              <RiArrowRightUpLine className="text-muted-foreground mb-1 inline size-4" /> —{" "}
              {project.note}
            </li>
          ))}
        </ul>
      </div>

      {/* skills */}
      <div className="container mx-auto max-w-3xl space-y-8 px-5">
        <h2 className={sectionHeading}>skills</h2>
        <ul className="text-muted-foreground list-disc space-y-1 pl-5">
          {skills.map((skill) => (
            <li key={skill.group}>
              <span className="text-foreground font-medium">{skill.group}</span> — {skill.items}
            </li>
          ))}
        </ul>
      </div>

      {/* education */}
      <div className="container mx-auto max-w-3xl space-y-8 px-5">
        <h2 className={sectionHeading}>education</h2>
        <div className="space-y-2">
          <p>B.Tech, Electronics &amp; Communication Engineering</p>
          <p className="text-muted-foreground">
            Delhi Technical Campus (GGSIPU), New Delhi · 2016–2020
          </p>
        </div>
      </div>

      {/* the story behind the work */}
      <div className="container mx-auto max-w-3xl space-y-8 px-5">
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
    </div>
  )
}
