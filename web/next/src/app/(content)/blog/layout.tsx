import { DocsLayout } from "fumadocs-ui/layouts/docs"
import { RootProvider } from "fumadocs-ui/provider/next"

import { baseOptions } from "@/lib/fumadocs"
import { blogSource } from "@/lib/source"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main>
      <RootProvider>
        <DocsLayout
          nav={{
            enabled: false,
          }}
          sidebar={{
            enabled: false,
          }}
          tree={blogSource.pageTree}
          {...baseOptions()}
        >
          {children}
        </DocsLayout>
      </RootProvider>
    </main>
  )
}
