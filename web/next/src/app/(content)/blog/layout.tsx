import { DocsLayout } from "fumadocs-ui/layouts/docs"
import { RootProvider } from "fumadocs-ui/provider/next"

import { baseOptions, contentRootProviderProps } from "@/lib/fumadocs"
import { blogSource } from "@/lib/source"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main>
      <RootProvider {...contentRootProviderProps}>
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
