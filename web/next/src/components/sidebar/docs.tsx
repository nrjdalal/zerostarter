"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const gettingStarted = [
  {
    title: "Introduction",
    url: "/docs",
  },
]

const deployment = [
  {
    title: "Vercel",
    url: "/docs/deployment/vercel",
  },
]

const manage = [
  {
    title: "Blog",
    url: "/docs/manage/blog",
  },
  {
    title: "Documentation",
    url: "/docs/manage/documentation",
  },
  {
    title: "Environment",
    url: "/docs/manage/environment",
  },
  {
    title: "llms.txt",
    url: "/docs/manage/llms-txt",
  },
  {
    title: "Release",
    url: "/docs/manage/release",
  },
]

export function SidebarDocs() {
  const pathname = usePathname()

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel className="pl-2.5">Getting Started</SidebarGroupLabel>
        <SidebarMenu>
          {gettingStarted.map((link) => {
            const isActive = pathname === link.url || pathname === link.url + "/"

            return (
              <SidebarMenuItem key={link.url}>
                <SidebarMenuButton asChild isActive={isActive}>
                  <Link href={link.url}>
                    <span>{link.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroup>
      <SidebarGroup>
        <SidebarGroupLabel className="pl-2.5">Manage</SidebarGroupLabel>
        <SidebarMenu>
          {manage.map((link) => {
            const isActive = pathname === link.url || pathname?.startsWith(link.url + "/")

            return (
              <SidebarMenuItem key={link.url}>
                <SidebarMenuButton asChild isActive={isActive}>
                  <Link href={link.url}>
                    <span>{link.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroup>
      <SidebarGroup>
        <SidebarGroupLabel className="pl-2.5">Deployment</SidebarGroupLabel>
        <SidebarMenu>
          {deployment.map((link) => {
            const isActive = pathname === link.url || pathname?.startsWith(link.url + "/")

            return (
              <SidebarMenuItem key={link.url}>
                <SidebarMenuButton asChild isActive={isActive}>
                  <Link href={link.url}>
                    <span>{link.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroup>
    </>
  )
}
