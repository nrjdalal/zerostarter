import { DocsLayout } from "fumadocs-ui/layouts/docs"
import { RootProvider } from "fumadocs-ui/provider/next"

import { baseOptions } from "@/lib/fumadocs"
import { consoleSource } from "@/lib/source"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="console-docs">
      <RootProvider
        theme={{
          enabled: false,
        }}
        search={{
          options: {
            api: "/api/console/search",
          },
        }}
      >
        <DocsLayout
          {...baseOptions()}
          nav={{ enabled: false }}
          sidebar={{ enabled: false }}
          tree={consoleSource.getPageTree()}
        >
          {children}
        </DocsLayout>
      </RootProvider>
    </main>
  )
}
