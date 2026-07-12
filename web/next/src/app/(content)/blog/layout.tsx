import { DocsLayout } from "fumadocs-ui/layouts/docs"
import { RootProvider } from "fumadocs-ui/provider/next"

import { contentSource } from "@/lib/content"
import { baseOptions } from "@/lib/fumadocs"

const blog = contentSource("blog")

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
          tree={blog.tree()}
        >
          {children}
        </DocsLayout>
      </RootProvider>
    </main>
  )
}
