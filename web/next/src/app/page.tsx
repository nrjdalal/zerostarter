import Link from "next/link"

import { ArrowRight, CheckCircle2, Code2, Database, Lock, Sparkles, Zap } from "lucide-react"

import { config } from "@/lib/config"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="from-background via-background to-muted/20 relative overflow-hidden border-b bg-linear-to-b pt-38 pb-32">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] mask-[radial-gradient(ellipse_80%_50%_at_50%_0%,white_70%,transparent_110%)] bg-size-[20px_20px]" />
        <div className="relative z-10 container mx-auto max-w-6xl px-5">
          <div className="mx-auto max-w-3xl text-center">
            <div className="bg-muted/50 mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm">
              <span>{config.app.name}</span>
            </div>
            <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              The{" "}
              <span className="from-primary to-primary/60 bg-linear-to-r bg-clip-text text-transparent">
                SaaS
              </span>{" "}
              Starter
            </h1>
            <p className="text-muted-foreground mb-8 text-lg sm:text-xl">
              {config.app.description}
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg" className="group">
                <Link href="/docs">
                  Get Started
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={config.social.github} target="_blank" rel="noopener noreferrer">
                  View on GitHub
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-muted/30 border-b py-24">
        <div className="container mx-auto max-w-6xl px-5">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Everything You Need to Ship Fast
            </h2>
            <p className="text-muted-foreground mx-auto max-w-2xl">
              Built with the best tools and practices. Type-safe from frontend to backend.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <div className="bg-primary/10 mb-2 flex size-12 items-center justify-center rounded-lg">
                  <Code2 className="text-primary size-6" />
                </div>
                <CardTitle>Type-Safe API Client</CardTitle>
                <CardDescription>
                  End-to-end type safety with Hono RPC. Your frontend knows exactly what your
                  backend returns.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <div className="bg-primary/10 mb-2 flex size-12 items-center justify-center rounded-lg">
                  <Zap className="text-primary size-6" />
                </div>
                <CardTitle>High Performance</CardTitle>
                <CardDescription>
                  Built on Bun runtime and Turborepo for lightning-fast development and builds.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <div className="bg-primary/10 mb-2 flex size-12 items-center justify-center rounded-lg">
                  <Lock className="text-primary size-6" />
                </div>
                <CardTitle>Authentication Ready</CardTitle>
                <CardDescription>
                  Better Auth integration with GitHub OAuth. Add more providers in minutes.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <div className="bg-primary/10 mb-2 flex size-12 items-center justify-center rounded-lg">
                  <Database className="text-primary size-6" />
                </div>
                <CardTitle>Database & ORM</CardTitle>
                <CardDescription>
                  PostgreSQL with Drizzle ORM. Migrations and type-safe queries out of the box.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <div className="bg-primary/10 mb-2 flex size-12 items-center justify-center rounded-lg">
                  <CheckCircle2 className="text-primary size-6" />
                </div>
                <CardTitle>Modern UI Components</CardTitle>
                <CardDescription>
                  Shadcn UI components with Tailwind CSS. Beautiful, accessible, and customizable.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <div className="bg-primary/10 mb-2 flex size-12 items-center justify-center rounded-lg">
                  <Sparkles className="text-primary size-6" />
                </div>
                <CardTitle>Monorepo Architecture</CardTitle>
                <CardDescription>
                  Shared packages for auth, database, and env. Scale your codebase efficiently.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="border-b py-24">
        <div className="container mx-auto max-w-6xl px-5">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Built with Best-in-Class Tools
            </h2>
            <p className="text-muted-foreground mx-auto max-w-2xl">
              Carefully selected stack for modern SaaS development.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { name: "Next.js 16", desc: "React Framework" },
              { name: "Hono", desc: "Web Framework" },
              { name: "Bun", desc: "Runtime & Package Manager" },
              { name: "Turborepo", desc: "Monorepo Build System" },
              { name: "Drizzle ORM", desc: "Type-Safe ORM" },
              { name: "Better Auth", desc: "Authentication" },
              { name: "Shadcn UI", desc: "UI Components" },
              { name: "TanStack Query", desc: "Data Fetching" },
            ].map((tech) => (
              <div
                key={tech.name}
                className="bg-card hover:bg-accent rounded-lg border p-4 text-center transition-colors"
              >
                <div className="font-semibold">{tech.name}</div>
                <div className="text-muted-foreground text-sm">{tech.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Code Example Section */}
      <section className="bg-muted/30 border-b py-24">
        <div className="container mx-auto max-w-6xl px-5">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Type-Safe API Calls
            </h2>
            <p className="text-muted-foreground mx-auto max-w-2xl">
              Full type inference from backend to frontend. No more manual type definitions.
            </p>
          </div>
        </div>
        <div className="w-full px-5">
          <pre className="bg-muted mx-auto w-full max-w-3xl overflow-x-auto rounded-lg p-6 text-sm">
            <code className="block overflow-x-auto whitespace-pre">
              {`import { apiClient } from "@/lib/api/client"

// Fully typed request and response
const res = await apiClient.health.$get()
const data = await res.json()`}
            </code>
          </pre>
        </div>
      </section>

      {/* Getting Started Section */}
      <section className="border-b py-24">
        <div className="container mx-auto max-w-6xl px-5">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Get Started in Minutes
            </h2>
            <p className="text-muted-foreground mx-auto max-w-2xl">
              Clone, install, and start building. It's that simple.
            </p>
          </div>
        </div>
        <div className="w-full px-5">
          <pre className="bg-muted mx-auto w-full max-w-3xl overflow-x-auto rounded-lg p-6 text-sm">
            <code className="block overflow-x-auto whitespace-pre">
              {`# Clone the template
bunx gitpick ${config.social.github}
cd zerostarter

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env

# Run database migrations
bun run db:migrate

# Start development servers
bun dev`}
            </code>
          </pre>
        </div>
        <div className="container mx-auto mt-8 max-w-6xl px-5 text-center">
          <Button asChild size="lg" className="group">
            <Link href="/docs">
              Get Started
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="from-background to-muted/20 bg-linear-to-b py-24">
        <div className="container mx-auto max-w-4xl px-5 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to Build Your SaaS?
          </h2>
          <p className="text-muted-foreground mb-8 text-lg">
            Start building your next project with {config.app.name} today.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="group">
              <Link href="/docs">
                Get Started
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={config.social.github} target="_blank" rel="noopener noreferrer">
                Star on GitHub
              </a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
