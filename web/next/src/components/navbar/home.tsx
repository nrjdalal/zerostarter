"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Loader2 } from "lucide-react"

import { useSession } from "@/lib/auth/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import Access from "@/components/access"
import ModeToggle from "@/components/mode-toggle"

export default function Component() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const [scrolled, setScrolled] = useState(false)
  const [toDashboard, setToDashboard] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0)
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  if (pathname !== "/") return null

  return (
    <div
      className={cn(
        "fixed top-0 left-1/2 z-50 w-full -translate-x-1/2",
        !scrolled ? "px-5 pt-5" : "bg-sidebar border-b pt-0",
      )}
    >
      <div
        className={cn(
          "mx-auto flex min-h-14 max-w-screen-lg items-center justify-between px-5",
          !scrolled && "bg-sidebar rounded-md border",
        )}
      >
        <Link href="/" className="font-bold">
          ACME Inc.
        </Link>
        <div className="flex items-center gap-2.5">
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

          <div className="-mr-2.5">
            <ModeToggle />
          </div>
        </div>
      </div>
    </div>
  )
}
