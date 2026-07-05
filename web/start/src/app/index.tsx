import { site } from "@packages/config/site"
import { createFileRoute } from "@tanstack/react-router"

// Transitional boot page proving the shell; the real landing page from web/next/src/app/(marketing)/page.tsx replaces this in the marketing slice.
export const Route = createFileRoute("/")({
  component: Home,
})

function Home() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-5xl font-bold tracking-tight">{site.name}</h1>
      <p className="text-muted-foreground max-w-md text-lg">{site.tagline}</p>
    </main>
  )
}
