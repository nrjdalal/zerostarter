"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Loader2 } from "lucide-react"

import { useSession } from "@/lib/auth/client"
import { config } from "@/lib/config"
import { Button } from "@/components/ui/button"
import { Access } from "@/components/access"
import { ModeToggle } from "@/components/mode-toggle"

export function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const [toDashboard, setToDashboard] = useState(false)

  if (pathname !== "/" && !pathname?.startsWith("/docs")) return null

  return (
    <div className="bg-sidebar fixed top-0 left-0 z-50 w-full border-b">
      <div className="flex min-h-14 items-center justify-between px-5">
        <Link href="/" className="font-bold">
          {config.app.name}
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
