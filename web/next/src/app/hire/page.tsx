import { site } from "@packages/config/site"
import {
  RiArrowRightUpLine,
  RiFileTextLine,
  RiGithubFill,
  RiLinkedinFill,
  RiMailLine,
  RiTwitterXFill,
} from "@remixicon/react"
import type { Metadata } from "next"
import Link from "next/link"

import { config } from "@/lib/config"
import { caveat, newsreader } from "@/lib/fonts"
import { cn } from "@/lib/utils"

const ogImageUrl = `${config.app.url}/og?${new URLSearchParams({
  section: "Hire",
  title: "Neeraj Dalal",
  description: "AI-native product engineer",
}).toString()}`

export const metadata: Metadata = {
  title: "Neeraj Dalal",
  description:
    "AI-native product engineer building SaaS, developer tools, and agent infrastructure.",
  openGraph: {
    type: "website",
    siteName: site.name,
    url: `${config.app.url}/hire`,
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "Neeraj Dalal - AI-native product engineer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl],
  },
}

const proof: { value: string; label: string }[] = [
  { value: "5+ years", label: "shipping production software" },
  { value: "500+ PRs", label: "at LightWork AI" },
  { value: "1,000+", label: "GitHub stars across open source" },
  { value: "250+", label: "public repositories" },
  { value: "10,000+", label: "installs across VS Code extensions" },
  { value: "30,000+", label: "weekly npm downloads" },
]

const roles = [
  "AI product engineer",
  "Senior full-stack engineer",
  "Founding engineer",
  "Developer-experience engineer",
  "Developer-tools engineer",
  "Platform / product engineer",
  "TypeScript / Next.js engineer",
]

const sections: {
  title: string
  projects: {
    href: string
    title: string
    description: string
    external?: boolean
  }[]
}[] = [
  {
    title: "building",
    projects: [
      {
        href: config.app.url,
        title: "ZeroStarter",
        description: "Go from 0 to production in 15 minutes.",
        external: false,
      },
    ],
  },
  {
    title: "working",
    projects: [
      {
        href: "https://lightwork.co",
        title: "LightWork AI",
        description: "The future of property management.",
      },
    ],
  },
  {
    title: "npm",
    projects: [
      {
        href: "https://github.com/nrjdalal/gitpick",
        title: "GitPick",
        description: "Clone exactly what you need aka straightforward project scaffolding!",
      },
      {
        href: "https://github.com/nrjdalal/smart-registry",
        title: "Smart Registry",
        description:
          "A zero-configuration (no registry.json required), shadcn add / open in v0 compatible registry builder.",
      },
      {
        href: "https://github.com/nrjdalal/karabiner-human-config",
        title: "Karabiner Human Config",
        description: "The easiest way to write Karabiner-Elements configuration files, ever!",
      },
      {
        href: "https://github.com/nrjdalal/pglaunch",
        title: "pglaunch",
        description:
          "Generate multiple PostgreSQL connection strings/databases using CLI for development environments!",
      },
    ],
  },
  {
    title: "github",
    projects: [
      {
        href: "https://github.com/nrjdalal/spacewall",
        title: "Spacewall",
        description: "Spacewall is an open-source, Linktree-like website builder.",
      },
      {
        href: "https://github.com/nrjdalal/awesome-templates",
        title: "Awesome Templates",
        description:
          "Explore a curated collection of up-to-date templates for various projects and frameworks, refreshed every 8 hours.",
      },
      {
        href: "https://github.com/nrjdalal/rdt-li",
        title: "rdt.li",
        description: "Self hostable, feature rich, minimalistic and open source URL shortener.",
      },
    ],
  },
]

const buttonClass =
  "bg-secondary hover:bg-secondary/80 flex items-center gap-2 rounded-md px-4 py-2 text-sm transition-colors"
const headingClass = `${caveat.className} text-muted-foreground text-3xl font-semibold tracking-wide`
const linkClass = "border-border hover:border-ring border-b transition-colors"

export default function Page() {
  return (
    <main className="bg-background text-foreground min-h-dvh space-y-16 py-24 text-lg">
      {/* hook */}
      <div className="container mx-auto max-w-3xl space-y-8 px-4 md:px-6">
        <h1 className={cn(caveat.className, "text-3xl font-semibold tracking-wide")}>nrjdalal</h1>

        <div className="space-y-4">
          <p>
            AI-native product engineer building SaaS products, developer tools, and agent
            infrastructure.{" "}
            <span className={cn(newsreader.className, "font-medium tracking-wide italic")}>
              I learn by shipping.
            </span>
          </p>
          <p>
            Five-plus years shipping production web apps, internal platforms, open-source developer
            tools, and AI-native systems. Right now I'm a Product Engineer at{" "}
            <a
              href="https://lightwork.co"
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              LightWork AI
            </a>
            , building AI agent tooling and core product surfaces for an AI-powered
            property-management platform.
          </p>
          <p>
            Before that I helped take SaaS and AI products from 0 to 1, shipped scraping- and
            automation-heavy SaaS, and built open-source tools now used by projects including{" "}
            <span className={cn(newsreader.className, "font-medium tracking-wide italic")}>
              TanStack, SST, Electric SQL, and Storybook
            </span>
            . I care about clean systems, fast builds, strong types, useful docs, and software that
            survives real users.
          </p>
          <p className="font-medium">
            Available for senior product engineering, full-stack TypeScript, AI tooling,
            developer-experience, and founding-engineer roles.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            href="https://github.com/nrjdalal"
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass}
          >
            <RiGithubFill className="size-4" />
            GitHub
          </a>
          <a
            href="https://x.com/nrjdalal"
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass}
          >
            <RiTwitterXFill className="size-4" />
            @nrjdalal
          </a>
          <a
            href="https://linkedin.com/in/nrjdalal"
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass}
          >
            <RiLinkedinFill className="size-4" />
            LinkedIn
          </a>
          <a href="mailto:nrjdalal.dev@gmail.com" className={buttonClass}>
            <RiMailLine className="size-4" />
            nrjdalal.dev@gmail.com
          </a>
          <Link href="/resume" className={buttonClass}>
            <RiFileTextLine className="size-4" />
            Resume
          </Link>
        </div>
      </div>

      {/* proof */}
      <div className="container mx-auto max-w-3xl px-4 md:px-6">
        <div className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-3">
          {proof.map((stat) => (
            <div key={stat.value} className="space-y-1">
              <div className="text-2xl font-semibold tracking-tight">{stat.value}</div>
              <div className="text-muted-foreground text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* work */}
      <div className="container mx-auto grid max-w-3xl gap-8 px-4 sm:grid-cols-2 md:px-6">
        {sections.map((section) => (
          <div key={section.title} className="space-y-8">
            <h2 className={headingClass}>{section.title}</h2>
            {section.projects.map((project) => (
              <div key={project.title} className="space-y-2">
                {project.external === false ? (
                  <Link href={project.href} className={linkClass}>
                    {project.title}
                  </Link>
                ) : (
                  <>
                    <a
                      href={project.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={linkClass}
                    >
                      {project.title}
                    </a>
                    <RiArrowRightUpLine className="text-muted-foreground mb-2 inline size-4" />
                  </>
                )}
                <p className="text-muted-foreground mt-2">{project.description}</p>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* writing */}
      <div className="container mx-auto max-w-3xl space-y-8 px-4 md:px-6">
        <h2 className={headingClass}>writing</h2>
        <div className="space-y-2">
          <Link href="/blog/a-biography-written-in-code" className={linkClass}>
            A Biography Written in Code
          </Link>
          <p className="text-muted-foreground mt-2">
            The résumé is the clean version. The real one is six years, 250 repositories, and the
            path from shell scripts to AI-agent infrastructure, the mistakes and patterns behind the
            output. Read it if you want to understand how I think, not just what I shipped.
          </p>
        </div>
      </div>

      {/* hire me */}
      <div className="container mx-auto max-w-3xl space-y-8 px-4 md:px-6">
        <h2 className={headingClass}>hire me</h2>
        <div className="space-y-4">
          <p>
            I'm best suited for teams building ambitious products with a small, high-agency
            engineering group. I can own features end to end, move between frontend and backend
            without handoff friction, and build the internal tooling that keeps a team fast,
            especially with TypeScript-heavy systems, AI product workflows, developer experience,
            monorepos, scraping and data pipelines, or turning early ambiguity into something
            shippable.
          </p>
          <p className="text-muted-foreground">{roles.join(" · ")}</p>
          <p>
            <span className={cn(newsreader.className, "font-medium tracking-wide italic")}>
              The speed of a builder, the taste of someone who maintains tools for other developers,
              and the judgment that comes from shipping enough software to know where the sharp
              edges are.
            </span>
          </p>
        </div>
      </div>

      {/* hobbies */}
      <div className="container mx-auto max-w-3xl space-y-8 px-4 md:px-6">
        <h2 className={headingClass}>hobbies</h2>
        <div className="space-y-4">
          <p>
            When I'm not coding, you'll find me consuming content and playing games.{" "}
            <span className={cn(newsreader.className, "font-medium tracking-wide italic")}>
              This year, I want to travel more and explore new places
            </span>
            .
          </p>
          <p className="text-muted-foreground">
            Lost touch with fitness somewhere along the way - working on getting back to it.
          </p>
        </div>
      </div>

      {/* connect */}
      <div className="container mx-auto max-w-3xl space-y-8 px-4 md:px-6">
        <h2 className={headingClass}>connect</h2>
        <p>
          Want to chat? Leave a message on{" "}
          <a
            href="https://x.com/nrjdalal"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="X (Twitter)"
            className={linkClass}
          >
            <RiTwitterXFill className="-mt-1 inline size-5" />
          </a>{" "}
          or send an email to{" "}
          <a href="mailto:nrjdalal.dev@gmail.com" className={linkClass}>
            nrjdalal.dev@gmail.com
          </a>
          .
        </p>
      </div>
    </main>
  )
}
