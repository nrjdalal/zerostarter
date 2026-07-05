import { notFound } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { getRequest, getRequestHeader } from "@tanstack/react-start/server"

import { auth } from "@/lib/auth"
import { getConsoleSession } from "@/lib/auth/console"
import { config } from "@/lib/config"
import { toPageInfo, type PageInfo } from "@/lib/fumadocs"
import { consoleSource } from "@/lib/source"

function readCookie(name: string): string | undefined {
  const header = getRequestHeader("cookie")
  if (!header) return undefined
  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf("=")
    if (eq > 0 && part.slice(0, eq) === name) return decodeURIComponent(part.slice(eq + 1))
  }
  return undefined
}

// The SidebarShell's persisted open state, read from the same cookie the sidebar writes.
function sidebarDefaultOpen(): boolean {
  const state = readCookie("sidebar_state")
  return state ? state === "true" : true
}

// Port of the Next.js app's (protected)/layout.tsx server work: session gate data, the last-active-organization restore, and the sidebar cookie.
export const getProtectedContext = createServerFn({ method: "GET" }).handler(async () => {
  const session = await auth.api.getSession()
  if (!session?.user) return null

  if (!session.session.activeOrganizationId) {
    const lastOrgId = readCookie(`last-active-org_${session.user.id}`)
    if (lastOrgId) {
      const url = `${config.api.internalUrl || config.api.url}/api/auth/organization/set-active`
      const reqHeaders = Object.fromEntries(getRequest().headers.entries())
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { ...reqHeaders, "content-type": "application/json" },
          body: JSON.stringify({ organizationId: lastOrgId }),
        })
        if (!response.ok) {
          console.error(
            `failed to restore active organization: ${response.status} ${response.statusText}`,
          )
        }
      } catch (error) {
        console.error("failed to restore active organization", error)
      }
    }
  }

  return { session, defaultOpen: sidebarDefaultOpen() }
})

// Gates /console: admin session or a thrown notFound (never a redirect).
export const getConsoleContext = createServerFn({ method: "GET" }).handler(async () => {
  const session = await getConsoleSession()
  if (!session) throw notFound()
  return { session, defaultOpen: sidebarDefaultOpen() }
})

// Console pages gate themselves too: the layout and page loaders run in parallel, so the sensitive content never rides along with a failed layout gate.
export const getConsoleTree = createServerFn({ method: "GET" }).handler(async () => {
  if (!(await getConsoleSession())) throw notFound()
  return consoleSource.serializePageTree(consoleSource.getPageTree())
})

export const getConsolePage = createServerFn({ method: "GET" })
  .validator((slugs: string[]) => slugs)
  .handler(async ({ data: slugs }): Promise<PageInfo> => {
    if (!(await getConsoleSession())) throw notFound()
    const page = consoleSource.getPage(slugs)
    if (!page) throw notFound()
    return toPageInfo(page)
  })
