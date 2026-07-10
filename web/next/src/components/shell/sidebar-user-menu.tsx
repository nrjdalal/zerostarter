"use client"

import { env } from "@packages/env/web-next"
import {
  RiArrowRightSLine,
  RiDashboardLine,
  RiHome4Line,
  RiLogoutBoxLine,
  RiMessage2Line,
  RiTerminalBoxLine,
} from "@remixicon/react"
import { type User } from "better-auth/types"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { SidebarDropdownMenu } from "@/components/shell/sidebar-dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { SidebarMenuItem } from "@/components/ui/sidebar"
import { authClient } from "@/lib/auth/client"

function getInitials(name: string) {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

// Shared sidebar user dropdown (avatar, identity, home link, feedback, sign out). Used by every sidebar footer so the menu and `getInitials` live in one place.
export function SidebarUserMenu({ user, area }: { user: User; area?: "dashboard" | "console" }) {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  // The user menu is shared, so the cross-link points at the other workspace: dashboard -> console, console -> dashboard.
  const crossLink =
    area === "dashboard"
      ? { label: "Console", href: "/console", icon: <RiTerminalBoxLine /> }
      : area === "console"
        ? { label: "Dashboard", href: "/dashboard", icon: <RiDashboardLine /> }
        : null

  const avatar = (
    <Avatar className="size-8 rounded-md after:hidden">
      <AvatarImage src={user.image ?? ""} alt={user.name} className="rounded-md" />
      <AvatarFallback className="rounded-md">{getInitials(user.name)}</AvatarFallback>
    </Avatar>
  )
  const identity = { leading: avatar, primary: user.name, secondary: user.email }

  return (
    <SidebarMenuItem>
      <SidebarDropdownMenu trigger={identity} header={identity} align="end" mobileSide="top">
        {/* The sidebar brand stays inside the app, so this is the one way back to the landing page. */}
        <DropdownMenuItem render={<Link href="/" className="cursor-pointer" />}>
          <RiHome4Line />
          Home
          <RiArrowRightSLine className="text-muted-foreground ml-auto size-4" />
        </DropdownMenuItem>
        {crossLink && (
          <DropdownMenuItem render={<Link href={crossLink.href} className="cursor-pointer" />}>
            {crossLink.icon}
            {crossLink.label}
            <RiArrowRightSLine className="text-muted-foreground ml-auto size-4" />
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {env.NEXT_PUBLIC_USERJOT_URL && (
          <DropdownMenuItem
            render={
              <Link
                href={env.NEXT_PUBLIC_USERJOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer"
              />
            }
          >
            <RiMessage2Line />
            Feedback
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          disabled={signingOut}
          onClick={async () => {
            if (signingOut) return
            setSigningOut(true)
            try {
              await authClient.signOut()
              router.push("/")
            } catch {
              toast.error("Failed to sign out. Please try again.")
              setSigningOut(false)
            }
          }}
        >
          <RiLogoutBoxLine />
          Log out
        </DropdownMenuItem>
      </SidebarDropdownMenu>
    </SidebarMenuItem>
  )
}
