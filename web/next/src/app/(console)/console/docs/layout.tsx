import { DocsLayout } from "fumadocs-ui/layouts/docs"
import { RootProvider } from "fumadocs-ui/provider/next"

import { contentSource } from "@/lib/content"
import { baseOptions } from "@/lib/fumadocs"

const consoleDocs = contentSource("console")

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
          tree={consoleDocs.tree()}
        >
          {children}
        </DocsLayout>
      </RootProvider>
    </main>
  )
}
