"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Loader2, Menu } from "lucide-react"

import { useSession } from "@/lib/auth/client"
import { config } from "@/lib/config"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Access } from "@/components/access"
import { ModeToggle } from "@/components/mode-toggle"

const badges = [
  {
    href: "https://twitter.com/nrjdalal",
    src: "https://img.shields.io/twitter/follow/nrjdalal?label=%40nrjdalal",
    alt: "Twitter",
  },
  {
    href: "https://github.com/nrjdalal/zerostarter",
    src: "https://img.shields.io/github/stars/nrjdalal/zerostarter?color=blue",
    alt: "stars",
  },
]

function Badges({ onBadgeClick }: { onBadgeClick?: () => void }) {
  return (
    <>
      {badges.map((badge) => (
        <a
          key={badge.href}
          href={badge.href}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-opacity hover:opacity-80"
          onClick={onBadgeClick}
        >
          <img src={badge.src} alt={badge.alt} height="16" />
        </a>
      ))}
    </>
  )
}

export function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const [toDashboard, setToDashboard] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  if (pathname?.startsWith("/x")) return null

  const navLinks = [
    { href: "/docs", label: "Docs" },
    { href: "/blog", label: "Blog" },
  ]

  return (
    <div className="bg-sidebar fixed top-0 left-0 z-50 w-full border-b">
      <div className="flex min-h-14 items-center justify-between px-5">
        <Link href="/" className="text-2xl font-bold">
          {config.app.name}
        </Link>
        <div className="flex items-center gap-2.5">
          {/* Desktop Navigation */}
          <nav className="mx-5 hidden items-center gap-7.5 md:flex">
            {navLinks.map((link) => {
              const isActive = pathname?.startsWith(link.href)
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

          {/* Badges */}
          <div className="mr-5 hidden items-center gap-2.5 md:flex">
            <Badges />
          </div>

          {session?.user ? (
            <Link href="/x">
              <Button
                className="w-24 cursor-pointer"
                size="sm"
                variant="outline"
                onClick={() => setToDashboard(true)}
              >
                {toDashboard ? <Loader2 className="animate-spin" /> : "Dashboard"}
              </Button>
            </Link>
          ) : (
            <Access />
          )}

          <div className="md:-mr-2.5">
            <ModeToggle />
          </div>

          {/* Mobile Navigation */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                className="-mr-2.5 size-8 cursor-pointer md:hidden [&_svg]:size-4!"
                aria-label="Open menu"
                size="sm"
                variant="outline"
              >
                <Menu aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle asChild>
                  <Link
                    href="/"
                    className="-mt-1 text-2xl font-bold"
                    onClick={() => setIsOpen(false)}
                  >
                    {config.app.name}
                  </Link>
                </SheetTitle>
              </SheetHeader>
              <nav className="ml-4 flex flex-col gap-5">
                {navLinks.map((link) => {
                  const isActive = pathname?.startsWith(link.href)
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
              </nav>
              {/* Mobile Badges */}
              <div className="mt-2.5 ml-4 flex items-center gap-2.5">
                <Badges onBadgeClick={() => setIsOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  )
}
