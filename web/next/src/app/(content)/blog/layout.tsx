import { DocsLayout } from "fumadocs-ui/layouts/docs"
import { RootProvider } from "fumadocs-ui/provider/next"

import { baseOptions } from "@/lib/fumadocs"
import { blogSource } from "@/lib/source"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main>
      <RootProvider
        theme={{
          enabled: false,
        }}
        search={{
          enabled: false,
        }}
      >
        <DocsLayout
          {...baseOptions()}
          nav={{ enabled: false }}
          sidebar={{ enabled: false }}
          tree={blogSource.getPageTree()}
        >
          {children}
        </DocsLayout>
      </RootProvider>
    </main>
  )
}
