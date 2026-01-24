"use client"

import {
  RiArrowRightUpLine,
  RiDiscordFill,
  RiGithubFill,
  RiLoaderLine,
  RiMenuLine,
  RiTwitterXFill,
} from "@remixicon/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

import { Access } from "@/components/access"
import { ModeToggle } from "@/components/mode-toggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useSession } from "@/lib/auth/client"
import { config } from "@/lib/config"
import { cn } from "@/lib/utils"

const socialLinks = [
  {
    href: "https://x.com/nrjdalal",
    icon: RiTwitterXFill,
    label: "X",
  },
  {
    href: "https://discord.gg/38FeAUmHSZ",
    icon: RiDiscordFill,
    label: "Discord",
  },
  {
    href: "https://github.com/nrjdalal/zerostarter",
    icon: RiGithubFill,
    label: "GitHub",
  },
]

function SocialLinks({ onClick }: { onClick?: () => void }) {
  return (
    <div className="flex items-center gap-5 lg:gap-3">
      {socialLinks.map((link) => (
        <Tooltip key={link.href}>
          <TooltipTrigger
            render={
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground/60 hover:text-foreground transition-colors"
                aria-label={link.label}
                onClick={onClick}
              />
            }
          >
            <link.icon className="size-6" aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent>{link.label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}

export function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const [toDashboard, setToDashboard] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  if (pathname?.startsWith("/dashboard")) return null

  const navLinks = [
    { href: "/docs", label: "Documentation" },
    { href: "/api/docs", label: "API Docs", external: true },
    { href: "/blog", label: "Blog" },
    { href: "/hire", label: "Hire" },
  ]

  return (
    <div className="bg-sidebar fixed top-0 left-0 z-50 w-full border-b">
      <div className="flex min-h-14 items-center justify-between px-3.5">
        <Link href="/" className="flex items-center gap-2 font-bold">
          {config.app.name}
          <Badge variant="secondary" className="text-xs">
            RC
          </Badge>
        </Link>
        <div className="flex items-center gap-2.5">
          {/* Desktop Navigation */}
          <nav className="mx-5 hidden items-center gap-7.5 lg:flex">
            {navLinks.map((link) => {
              const isActive = !link.external && pathname?.startsWith(link.href)
              if (link.external) {
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground/60 hover:text-foreground/80 font-medium transition-colors"
                  >
                    {link.label}
                    <RiArrowRightUpLine className="-mt-3 inline size-3.5" />
                  </a>
                )
              }
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "font-medium transition-colors",
                    isActive ? "text-foreground" : "hover:text-foreground/80 text-foreground/60",
                  )}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* Social Links */}
          <div className="mr-5 hidden items-center gap-2.5 lg:flex">
            <SocialLinks />
          </div>

          {session?.user ? (
            <Button
              className="w-24 cursor-pointer"
              variant="outline"
              onClick={() => setToDashboard(true)}
              render={<Link href="/dashboard" />}
            >
              {toDashboard ? <RiLoaderLine className="animate-spin" /> : "Dashboard"}
            </Button>
          ) : (
            <Access />
          )}

          <div className="lg:-mr-2.5">
            <ModeToggle />
          </div>

          {/* Mobile Navigation */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger
              render={
                <Button
                  className="-mr-2.5 size-8 cursor-pointer lg:hidden [&_svg]:size-4!"
                  aria-label="Open menu"
                  size="sm"
                  variant="outline"
                />
              }
            >
              <RiMenuLine aria-hidden="true" />
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle
                  render={
                    <Link
                      href="/"
                      className="-mt-1 flex items-center gap-2 text-2xl font-bold"
                      onClick={() => setIsOpen(false)}
                    />
                  }
                >
                  {config.app.name}
                  <Badge variant="secondary" className="text-xs">
                    RC
                  </Badge>
                </SheetTitle>
              </SheetHeader>
              <nav className="ml-4 flex flex-col gap-5">
                {navLinks.map((link) => {
                  const isActive = !link.external && pathname?.startsWith(link.href)
                  if (link.external) {
                    return (
                      <a
                        key={link.href}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground/60 hover:text-foreground/80 font-medium transition-colors"
                        onClick={() => setIsOpen(false)}
                      >
                        {link.label}
                        <RiArrowRightUpLine className="-mt-3 inline size-3.5" />
                      </a>
                    )
                  }
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "font-medium transition-colors",
                        isActive
                          ? "text-foreground"
                          : "hover:text-foreground/80 text-foreground/60",
                      )}
                      onClick={() => setIsOpen(false)}
                    >
                      {link.label}
                    </Link>
                  )
                })}
                <Button
                  size="sm"
                  className="mt-2 w-fit"
                  onClick={() => setIsOpen(false)}
                  render={
                    <a href={config.social.github} target="_blank" rel="noopener noreferrer" />
                  }
                >
                  <RiGithubFill className="size-4" />
                  Get ZeroStarter
                </Button>
              </nav>
              {/* Mobile Social Links */}
              <div className="mt-2.5 ml-4 flex items-center gap-2.5">
                <SocialLinks onClick={() => setIsOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  )
}
