import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { SidebarUser } from "@/components/sidebar/user"

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession()

  if (!session?.user) redirect("/")

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader />
        <SidebarContent>{/* Content Goes Here */}</SidebarContent>
        <SidebarFooter>
          <SidebarUser user={session.user} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <main>
        <SidebarTrigger className="bg-sidebar absolute m-2 cursor-pointer border" />
        {children}
      </main>
    </SidebarProvider>
  )
}
