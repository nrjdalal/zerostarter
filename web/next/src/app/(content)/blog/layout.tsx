import { DocsLayout } from "fumadocs-ui/layouts/docs"
import { RootProvider } from "fumadocs-ui/provider/next"

import { getPublishedBlogPageTree } from "@/lib/blog"
import { baseOptions } from "@/lib/fumadocs"

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
          tree={getPublishedBlogPageTree()}
        >
          {children}
        </DocsLayout>
      </RootProvider>
    </main>
  )
}
