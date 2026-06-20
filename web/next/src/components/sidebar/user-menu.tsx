"use client"

import { env } from "@packages/env/web-next"
import { RiLogoutBoxLine, RiMessage2Line } from "@remixicon/react"
import { type User } from "better-auth/types"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { SidebarDropdownMenu } from "@/components/sidebar/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { SidebarMenuItem } from "@/components/ui/sidebar"
import { authClient } from "@/lib/auth/client"

function getInitials(name: string) {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

// Shared sidebar user dropdown (avatar, identity, feedback, sign out). Used by every sidebar footer so the menu and `getInitials` live in one place.
export function SidebarUserMenu({ user }: { user: User }) {
  const router = useRouter()

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
          className="cursor-pointer"
          onClick={async () => {
            await authClient.signOut()
            router.push("/")
          }}
        >
          <RiLogoutBoxLine />
          Log out
        </DropdownMenuItem>
      </SidebarDropdownMenu>
    </SidebarMenuItem>
  )
}
