"use client"

import { RiDiscordFill, RiGithubFill, RiTwitterXFill } from "@remixicon/react"
import Link from "next/link"

import { config } from "@/lib/config"

import { Wordmark } from "./wordmark"

const socialLinks = [
  { key: "twitter", label: "X (Twitter)", Icon: RiTwitterXFill },
  { key: "discord", label: "Discord", Icon: RiDiscordFill },
  { key: "github", label: "GitHub", Icon: RiGithubFill },
] as const

export function Footer() {
  return (
    <footer className="bg-background relative overflow-hidden border-t pt-20 pb-6">
      <div className="relative z-10 container mx-auto max-w-6xl px-5">
        <div className="mb-16 grid gap-12 md:grid-cols-4">
          <div className="col-span-1 space-y-4 md:col-span-2">
            <span className="text-2xl font-bold tracking-tight">{config.app.name}</span>
            <p className="text-muted-foreground max-w-xs leading-relaxed">
              {config.app.description}
            </p>
          </div>

          <div>
            <h4 className="mb-6 text-sm font-semibold tracking-wider uppercase">Resources</h4>
            <ul className="text-muted-foreground space-y-4 text-sm">
              {config.footer.navigation.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-primary transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-6 text-sm font-semibold tracking-wider uppercase">Connect</h4>
            <ul className="text-muted-foreground space-y-4 text-sm">
              {socialLinks.map(({ key, label, Icon }) => {
                const href = config.social[key]

                if (!href) return null

                return (
                  <li key={key}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary flex items-center gap-2 transition-colors"
                    >
                      <Icon className="size-4" />
                      {label}
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        <div className="text-muted-foreground flex items-center border-t pt-8 text-sm">
          <span>
            &copy; {new Date().getFullYear()} {config.app.name}
          </span>
        </div>

        <div className="mt-12 opacity-20 transition-opacity duration-700 ease-in-out hover:opacity-100 dark:opacity-30">
          <Wordmark />
        </div>
      </div>
    </footer>
  )
}
