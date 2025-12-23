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
  {
    title: "Architecture",
    url: "/docs/getting-started/architecture",
  },
  {
    title: "Project Structure",
    url: "/docs/getting-started/project-structure",
  },
  {
    title: "Type-Safe API Client",
    url: "/docs/getting-started/type-safe-api",
  },
  {
    title: "Installation",
    url: "/docs/getting-started/installation",
  },
  {
    title: "Scripts",
    url: "/docs/getting-started/scripts",
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
    title: "Feedback",
    url: "/docs/manage/feedback",
  },
  {
    title: "llms.txt",
    url: "/docs/manage/llms-txt",
  },
  {
    title: "Release",
    url: "/docs/manage/release",
  },
  {
    title: "robots.txt",
    url: "/docs/manage/robots",
  },
  {
    title: "Sitemap",
    url: "/docs/manage/sitemap",
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
      <SidebarGroup>
        <SidebarGroupLabel className="pl-2.5">MIT</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === "/docs/contributing" || pathname === "/docs/contributing/"}
            >
              <Link href="/docs/contributing">
                <span>Contributing</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </>
  )
}
