import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import SidebarUser from "@/components/sidebar/user"

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect("/access")
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader />
        <SidebarContent>{/* Content Goes Here */}</SidebarContent>
        <SidebarFooter>
          <SidebarUser user={session.user} />
        </SidebarFooter>
      </Sidebar>
      <main>
        <SidebarTrigger className="bg-sidebar absolute m-2 cursor-pointer border" />
        {children}
      </main>
    </SidebarProvider>
  )
}
