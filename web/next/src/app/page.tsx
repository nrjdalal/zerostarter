import { RiGithubFill, RiInstagramFill, RiRedditFill, RiTwitterXFill } from "@remixicon/react"

import { ApiStatus } from "@/components/api-status"
import { WaitlistForm } from "@/components/waitlist-form"
import { config } from "@/lib/config"

const socialLinks = [
  { href: config.social.github, icon: RiGithubFill, label: "GitHub" },
  { href: config.social.instagram, icon: RiInstagramFill, label: "Instagram" },
  { href: config.social.reddit, icon: RiRedditFill, label: "Reddit" },
  { href: config.social.x, icon: RiTwitterXFill, label: "X" },
]

export default function Home() {
  return (
    <div className="flex flex-col select-none">
      <section
        aria-label="Hero"
        className="from-background via-background to-muted/20 relative flex min-h-screen flex-col overflow-hidden bg-linear-to-b"
      >
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] mask-[radial-gradient(ellipse_80%_50%_at_50%_0%,white_70%,transparent_110%)] bg-size-[20px_20px]" />
        <div className="relative z-10 container mx-auto flex min-h-0 max-w-6xl flex-1 flex-col items-center justify-center px-5 py-12 sm:py-16">
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center text-center">
            <h1 className="mb-6 text-6xl font-bold tracking-tight sm:text-7xl lg:text-8xl">
              {config.app.name}
            </h1>
            <p className="text-muted-foreground mb-8 text-lg sm:text-xl lg:text-2xl">
              {config.app.tagline}
            </p>
            <WaitlistForm />
            <div className="mt-6 flex justify-center">
              <ApiStatus />
            </div>
          </div>
          <div className="flex items-center gap-5 pb-4">
            {socialLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.label}
                className="text-foreground/40 hover:text-foreground transition-colors"
              >
                <link.icon className="size-5" aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
