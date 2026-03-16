"use client"

import { RiArrowRightUpLine, RiDiscordFill, RiGithubFill, RiTwitterXFill } from "@remixicon/react"
import Link from "next/link"

import { config } from "@/lib/config"

import { Wordmark } from "./wordmark"

/**
 * Renders the landing-page footer with resource links, social links, and the animated wordmark.
 */
export function Footer() {
  return (
    <footer className="bg-background relative overflow-hidden border-t pt-20 pb-6">
      <div className="relative z-10 container mx-auto max-w-6xl px-5">
        <div className="mb-16 grid gap-12 md:grid-cols-4">
          <div className="col-span-1 space-y-4 md:col-span-2">
            <span className="text-2xl font-bold tracking-tight">{config.app.name}</span>
            <p className="text-muted-foreground max-w-xs leading-relaxed">
              {config.app.description} Built for developers who value speed and type-safety.
            </p>
          </div>

          <div>
            <h4 className="mb-6 text-sm font-semibold tracking-wider uppercase">Resources</h4>
            <ul className="text-muted-foreground space-y-4 text-sm">
              <li>
                <Link href="/docs" className="hover:text-primary transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <a
                  href="/api/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary flex items-center gap-1 transition-colors"
                >
                  API Docs
                  <RiArrowRightUpLine className="size-3.5" />
                </a>
              </li>
              <li>
                <Link href="/blog" className="hover:text-primary transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/hire" className="hover:text-primary transition-colors">
                  Hire
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-6 text-sm font-semibold tracking-wider uppercase">Connect</h4>
            <ul className="text-muted-foreground space-y-4 text-sm">
              <li>
                <a
                  href="https://x.com/nrjdalal"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary flex items-center gap-2 transition-colors"
                >
                  <RiTwitterXFill className="size-4" />X (Twitter)
                </a>
              </li>
              <li>
                <a
                  href="https://discord.gg/38FeAUmHSZ"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary flex items-center gap-2 transition-colors"
                >
                  <RiDiscordFill className="size-4" />
                  Discord
                </a>
              </li>
              <li>
                <a
                  href={config.social.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary flex items-center gap-2 transition-colors"
                >
                  <RiGithubFill className="size-4" />
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="text-muted-foreground flex flex-col items-center justify-between gap-4 border-t pt-8 text-sm md:flex-row md:gap-0">
          <div className="flex items-center gap-2">
            <span>
              © {new Date().getFullYear()} {config.app.name}
            </span>
            <span className="text-muted-foreground/30">|</span>
            <span className="flex items-center gap-1">
              Made by{" "}
              <a
                href="https://x.com/nrjdalal"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground font-medium hover:underline"
              >
                @nrjdalal
              </a>
            </span>
          </div>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
          </div>
        </div>

        {/* Large Background Wordmark (Now inside the container to match page margins) */}
        <div className="mt-12 opacity-20 transition-opacity duration-700 ease-in-out hover:opacity-100 dark:opacity-30">
          <Wordmark />
        </div>
      </div>
    </footer>
  )
}
