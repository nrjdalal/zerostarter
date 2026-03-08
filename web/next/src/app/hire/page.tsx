import {
  RiArrowRightUpLine,
  RiGithubFill,
  RiLinkedinFill,
  RiMailLine,
  RiTwitterXFill,
} from "@remixicon/react"
import type { Metadata } from "next"
import Link from "next/link"

import { config } from "@/lib/config"

const ogImageUrl = `${config.app.url}/api/og/hire?t=${Date.now()}`

export const metadata: Metadata = {
  title: "nrjdalal",
  description: "Crafting software that makes a difference.",
  openGraph: {
    type: "website",
    siteName: config.app.name,
    url: `${config.app.url}/hire`,
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "nrjdalal - Crafting software that makes a difference",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl],
  },
}

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
        title: "LightWorkAI",
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
        title: "Redirect.link",
        description: "Self hostable, feature rich, minimalistic and open source URL shortener.",
      },
    ],
  },
]

export default function Page() {
  return (
    <div className="bg-background text-foreground min-h-screen space-y-16 py-36 text-lg">
      {/* About */}
      <div className="container mx-auto max-w-3xl space-y-8 px-5">
        <h1 className="font-cursive text-3xl font-semibold tracking-wide">nrjdalal</h1>

        <p>
          Crafting software that makes a difference.{" "}
          <span className="font-serif font-medium tracking-wide italic">
            I build developer tools and infrastructure.
          </span>{" "}
          Experimenting with new technologies and ideas.
          <br />
          <br />I am currently building{" "}
          <Link
            href={config.app.url}
            className="border-border hover:border-ring border-b transition-colors"
          >
            ZeroStarter
          </Link>
          . When I'm out and about, you can find me on{" "}
          <a
            href="https://x.com/nrjdalal"
            target="_blank"
            rel="noopener noreferrer"
            className="border-border hover:border-ring border-b transition-colors"
          >
            <RiTwitterXFill className="-mt-1 inline size-4.5" />
          </a>
          .
        </p>

        <div className="flex flex-wrap gap-3">
          <a
            href="https://github.com/nrjdalal"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-secondary hover:bg-secondary/80 flex items-center gap-2 rounded-md px-4 py-2 text-sm transition-colors"
          >
            <RiGithubFill className="size-4" />
            GitHub
          </a>
          <a
            href="https://x.com/nrjdalal"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-secondary hover:bg-secondary/80 flex items-center gap-2 rounded-md px-4 py-2 text-sm transition-colors"
          >
            <RiTwitterXFill className="size-4" />
            @nrjdalal
          </a>
          <a
            href="https://linkedin.com/in/nrjdalal"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-secondary hover:bg-secondary/80 flex items-center gap-2 rounded-md px-4 py-2 text-sm transition-colors"
          >
            <RiLinkedinFill className="size-4" />
            LinkedIn
          </a>
          <a
            href="mailto:nrjdalal.dev@gmail.com"
            className="bg-secondary hover:bg-secondary/80 flex items-center gap-2 rounded-md px-4 py-2 text-sm transition-colors"
          >
            <RiMailLine className="size-4" />
            nrjdalal.dev@gmail.com
          </a>
        </div>
      </div>

      {/* Work */}
      <div className="container mx-auto grid max-w-3xl gap-8 px-5 sm:grid-cols-2">
        {sections.map((section) => (
          <div key={section.title} className="space-y-8">
            <h1 className="font-cursive text-muted-foreground text-3xl font-semibold tracking-wide">
              {section.title}
            </h1>
            {section.projects.map((project) => (
              <div key={project.title} className="space-y-2">
                {project.external === false ? (
                  <Link
                    href={project.href}
                    className="border-border hover:border-ring border-b transition-colors"
                  >
                    {project.title}
                  </Link>
                ) : (
                  <>
                    <a
                      href={project.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border-border hover:border-ring border-b transition-colors"
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

      {/* hobbies */}
      <div className="container mx-auto max-w-3xl space-y-8 px-5">
        <h1 className="font-cursive text-muted-foreground text-3xl font-semibold tracking-wide">
          hobbies
        </h1>
        <div className="space-y-4">
          <p>
            When I'm not coding, you'll find me consuming content and playing games.{" "}
            <span className="font-serif font-medium tracking-wide italic">
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
      <div className="container mx-auto max-w-3xl space-y-8 px-5">
        <h1 className="font-cursive text-muted-foreground text-3xl font-semibold tracking-wide">
          connect
        </h1>
        <p>
          Want to chat? Leave a message on{" "}
          <a
            href="https://x.com/nrjdalal"
            target="_blank"
            rel="noopener noreferrer"
            className="border-border hover:border-ring border-b transition-colors"
          >
            <RiTwitterXFill className="-mt-1 inline size-4.5" />
          </a>{" "}
          or send an email to{" "}
          <a
            href="mailto:nrjdalal.dev@gmail.com"
            className="border-border hover:border-ring border-b transition-colors"
          >
            nrjdalal.dev@gmail.com
          </a>
          .
        </p>
      </div>
    </div>
  )
}
