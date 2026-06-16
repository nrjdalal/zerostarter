"use client"

import { env } from "@packages/env/web-next"
import { RiExpandUpDownLine, RiLogoutBoxLine, RiMessage2Line } from "@remixicon/react"
import { type User } from "better-auth/types"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"
import { authClient } from "@/lib/auth/client"
import { cn } from "@/lib/utils"

function getInitials(name: string) {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

// Shared sidebar user dropdown (avatar, identity, feedback, sign out). Used by every sidebar footer so the menu and `getInitials` live in one place.
export function SidebarUserMenu({ user }: { user: User }) {
  const { isMobile } = useSidebar()
  const router = useRouter()

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer border"
            />
          }
        >
          <Avatar className="size-8 rounded-md">
            <AvatarImage src={user.image ?? ""} alt={user.name} />
            <AvatarFallback className="rounded-md">{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{user.name}</span>
            <span className="truncate text-xs">{user.email}</span>
          </div>
          <RiExpandUpDownLine className="ml-auto size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className={cn("w-(--anchor-width) min-w-56 rounded-lg", isMobile ? "mb-1" : "ml-3")}
          side={isMobile ? "top" : "right"}
          align="end"
          sideOffset={4}
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="size-8 rounded-md">
                  <AvatarImage src={user.image ?? ""} alt={user.name} />
                  <AvatarFallback className="rounded-md">{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
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
            className="cursor-pointer"
            onClick={async () => {
              await authClient.signOut()
              router.push("/")
            }}
          >
            <RiLogoutBoxLine />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}
