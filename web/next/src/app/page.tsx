import Image from "next/image"
import Link from "next/link"

import { RiGithubFill } from "@remixicon/react"
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Code2,
  Database,
  GitBranch,
  Globe,
  Heart,
  Lock,
  Rocket,
  Search,
  Shield,
  Sparkles,
  Users,
  Zap,
} from "lucide-react"
import { codeToHtml } from "shiki"

import { config } from "@/lib/config"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ApiStatus } from "@/components/api-status"

type Tech = {
  name: string
  icon: {
    light: string
    dark: string
  }
}

export const techStack: Tech[] = [
  {
    name: "Turborepo",
    icon: {
      light: "/landing/turborepo-light.svg",
      dark: "/landing/turborepo-dark.svg",
    },
  },
  {
    name: "React",
    icon: {
      light: "/landing/react-light.svg",
      dark: "/landing/react-dark.svg",
    },
  },
  {
    name: "Next.js",
    icon: {
      light: "/landing/nextjs-icon-dark.svg",
      dark: "/landing/nextjs-icon-dark.svg",
    },
  },
  {
    name: "Hono",
    icon: {
      light: "/landing/hono.svg",
      dark: "/landing/hono.svg",
    },
  },
  {
    name: "Tanstack Query",
    icon: {
      light: "/landing/tanstack.svg",
      dark: "/landing/tanstack.svg",
    },
  },
  {
    name: "Better Auth",
    icon: {
      light: "/landing/better-auth-light.svg",
      dark: "/landing/better-auth-dark.svg",
    },
  },
  {
    name: "Tailwind CSS",
    icon: {
      light: "/landing/tailwindcss.svg",
      dark: "/landing/tailwindcss.svg",
    },
  },
  {
    name: "Shadcn UI",
    icon: {
      light: "/landing/shadcn-ui-light.svg",
      dark: "/landing/shadcn-ui-dark.svg",
    },
  },
  {
    name: "Drizzle ORM",
    icon: {
      light: "/landing/drizzle-orm-light.svg",
      dark: "/landing/drizzle-orm-dark.svg",
    },
  },
  {
    name: "postgreSQL",
    icon: {
      light: "/landing/postgresql.svg",
      dark: "/landing/postgresql.svg",
    },
  },
  {
    name: "Bun",
    icon: {
      light: "/landing/bun.svg",
      dark: "/landing/bun.svg",
    },
  },
  {
    name: "Zod",
    icon: {
      light: "/landing/zod.svg",
      dark: "/landing/zod.svg",
    },
  },
  {
    name: "Fumadocs",
    icon: {
      light: "/landing/fumadocs.svg",
      dark: "/landing/fumadocs.svg",
    },
  },
  {
    name: "tsdown",
    icon: {
      light: "/landing/tsdown.svg",
      dark: "/landing/tsdown.svg",
    },
  },
  {
    name: "Oxlint",
    icon: {
      light: "/landing/oxlint.svg",
      dark: "/landing/oxlint.svg",
    },
  },
  {
    name: "Prettier",
    icon: {
      light: "/landing/prettier-light.svg",
      dark: "/landing/prettier-dark.svg",
    },
  },
  {
    name: "TypeScript",
    icon: {
      light: "/landing/typescript.svg",
      dark: "/landing/typescript.svg",
    },
  },
  {
    name: "Docker",
    icon: {
      light: "/landing/docker.svg",
      dark: "/landing/docker.svg",
    },
  },
  {
    name: "Vercel",
    icon: {
      light: "/landing/vercel-light.svg",
      dark: "/landing/vercel-dark.svg",
    },
  },
]

export default async function Home() {
  const typescriptCode = `import { apiClient } from "@/lib/api/client"

// Fully typed request and response
// TypeScript knows exactly what you're getting!
const res = await apiClient.health.$get()
const data = await res.json()`

  const bashCode = `# Clone the template
bunx gitpick ${config.social.github}/tree/main
cd zerostarter

# Install dependencies
bun install

# Set up environment variables (see docs)
cp .env.example .env

# Set up database
bun run db:generate
bun run db:migrate

# Start development
bun dev`

  const typescriptHtml = await codeToHtml(typescriptCode, {
    lang: "typescript",
    themes: {
      light: "github-light",
      dark: "github-dark",
    },
    defaultColor: false,
  })

  const bashHtml = await codeToHtml(bashCode, {
    lang: "bash",
    themes: {
      light: "github-light",
      dark: "github-dark",
    },
    defaultColor: false,
  })

  return (
    <div className="flex flex-col select-none">
      {/* Hero Section */}
      <section className="from-background via-background to-muted/20 relative flex min-h-screen flex-col overflow-hidden border-b bg-linear-to-b">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] mask-[radial-gradient(ellipse_80%_50%_at_50%_0%,white_70%,transparent_110%)] bg-size-[20px_20px]" />
        <div className="relative z-10 container mx-auto flex min-h-0 max-w-6xl flex-1 items-center justify-center px-5 py-12 sm:py-16">
          <div className="mx-auto flex min-h-[700px] max-w-3xl flex-col justify-center text-center">
            <div className="bg-muted/50 mx-auto mb-6 inline-flex w-fit items-center gap-2 rounded-full border px-4 py-1.5 text-sm">
              <span>
                The{" "}
                <span className="from-primary to-primary/60 bg-linear-to-r bg-clip-text font-semibold text-transparent">
                  scalable and production-ready
                </span>{" "}
                SaaS starter kit
              </span>
            </div>
            <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Go from 0 to production in{" "}
              <span className="from-primary to-primary/60 bg-linear-to-r bg-clip-text text-transparent">
                15 minutes
              </span>
            </h1>
            <p className="text-muted-foreground mb-8 text-lg sm:text-xl lg:text-2xl">
              {config.app.description} Deploy with one click and start building features on day one.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg" className="group h-12 px-8 text-base">
                <a href={config.social.github} target="_blank" rel="noopener noreferrer">
                  <RiGithubFill className="size-5" />
                  Get ZeroStarter
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="group h-12 px-8 text-base">
                <Link href="/docs">
                  Documentation
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
            <p className="text-muted-foreground mt-6 text-sm">
              ⭐ Star us on GitHub • 100+ developers trust ZeroStarter
            </p>
            <div className="mt-4 flex justify-center">
              <ApiStatus />
            </div>
          </div>
        </div>

        {/* Tech Stack Badges */}
        <div className="bg-muted/30 relative overflow-hidden border-t py-8">
          <div className="animate-marquee flex w-max gap-12 px-6">
            {[...techStack, ...techStack].map((tech, index) => (
              <div
                key={`${tech.name}-${index}`}
                className="text-muted-foreground hover:text-foreground flex items-center gap-2 whitespace-nowrap transition-colors"
              >
                {/* LIGHT / DARK SVG swap */}
                <span className="relative h-5 w-5 shrink-0">
                  <Image src={tech.icon.light} alt={tech.name} fill className="block dark:hidden" />
                  <Image src={tech.icon.dark} alt={tech.name} fill className="hidden dark:block" />
                </span>

                <span className="text-sm font-medium">{tech.name}</span>
              </div>
            ))}
          </div>

          <style
            dangerouslySetInnerHTML={{
              __html: `
        @keyframes marquee {
          from {
            transform: translate3d(0, 0, 0);
          }
          to {
            transform: translate3d(-50%, 0, 0);
          }
        }

        .animate-marquee {
          animation: marquee 28s linear infinite;
          will-change: transform;
        }
      `,
            }}
          />
        </div>
      </section>

      {/* Features Section */}
      <section className="border-b py-24">
        <div className="container mx-auto max-w-6xl px-5">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Game-changing features to launch at{" "}
              <span className="from-primary to-primary/60 bg-linear-to-r bg-clip-text text-transparent">
                Zero speed
              </span>
            </h2>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
              Everything you need to launch your SaaS in no time. Get all the core functionalities
              and integrations out of the box, so you can focus on the business.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="hover:border-primary/50 border-2 transition-colors">
              <CardHeader>
                <div className="bg-primary/10 mb-2 flex size-12 items-center justify-center rounded-lg">
                  <Code2 className="text-primary size-6" />
                </div>
                <CardTitle>Type-Safe API Client</CardTitle>
                <CardDescription>
                  End-to-end type safety with Hono RPC. Your frontend knows exactly what your
                  backend returns. Catch errors at compile time.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="hover:border-primary/50 border-2 transition-colors">
              <CardHeader>
                <div className="bg-primary/10 mb-2 flex size-12 items-center justify-center rounded-lg">
                  <Lock className="text-primary size-6" />
                </div>
                <CardTitle>Authentication</CardTitle>
                <CardDescription>
                  Better Auth integration with GitHub OAuth, email/password, magic links, and more.
                  Add providers in minutes.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="hover:border-primary/50 border-2 transition-colors">
              <CardHeader>
                <div className="bg-primary/10 mb-2 flex size-12 items-center justify-center rounded-lg">
                  <Database className="text-primary size-6" />
                </div>
                <CardTitle>Database & ORM</CardTitle>
                <CardDescription>
                  PostgreSQL with Drizzle ORM. Migrations and type-safe queries out of the box.
                  Production-ready schema.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="hover:border-primary/50 border-2 transition-colors">
              <CardHeader>
                <div className="bg-primary/10 mb-2 flex size-12 items-center justify-center rounded-lg">
                  <Zap className="text-primary size-6" />
                </div>
                <CardTitle>High Performance</CardTitle>
                <CardDescription>
                  Built on Bun runtime and Turborepo for lightning-fast development and builds.
                  Optimized for production.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="hover:border-primary/50 border-2 transition-colors">
              <CardHeader>
                <div className="bg-primary/10 mb-2 flex size-12 items-center justify-center rounded-lg">
                  <CheckCircle2 className="text-primary size-6" />
                </div>
                <CardTitle>Modern UI Components</CardTitle>
                <CardDescription>
                  Shadcn UI components with Tailwind CSS. Beautiful, accessible, and customizable.
                  Ready to use or customize.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="hover:border-primary/50 border-2 transition-colors">
              <CardHeader>
                <div className="bg-primary/10 mb-2 flex size-12 items-center justify-center rounded-lg">
                  <Sparkles className="text-primary size-6" />
                </div>
                <CardTitle>Monorepo Architecture</CardTitle>
                <CardDescription>
                  Shared packages for auth, database, and env. Scale your codebase efficiently with
                  clean separation of concerns.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="hover:border-primary/50 border-2 transition-colors">
              <CardHeader>
                <div className="bg-primary/10 mb-2 flex size-12 items-center justify-center rounded-lg">
                  <Rocket className="text-primary size-6" />
                </div>
                <CardTitle>One-Click Deployment</CardTitle>
                <CardDescription>
                  Docker and Vercel configurations included. Deploy to production in minutes, not
                  days. Pre-configured CI/CD.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="hover:border-primary/50 border-2 transition-colors">
              <CardHeader>
                <div className="bg-primary/10 mb-2 flex size-12 items-center justify-center rounded-lg">
                  <BookOpen className="text-primary size-6" />
                </div>
                <CardTitle>Documentation & llms.txt</CardTitle>
                <CardDescription>
                  Fumadocs with auto-generated llms.txt endpoint. Full-text search and structured
                  content for AI assistants.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="hover:border-primary/50 border-2 transition-colors">
              <CardHeader>
                <div className="bg-primary/10 mb-2 flex size-12 items-center justify-center rounded-lg">
                  <Shield className="text-primary size-6" />
                </div>
                <CardTitle>Type-Safe Environment</CardTitle>
                <CardDescription>
                  Centralized environment variables with validation. One env file, selective access
                  per package. Never miss a variable.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="hover:border-primary/50 border-2 transition-colors">
              <CardHeader>
                <div className="bg-primary/10 mb-2 flex size-12 items-center justify-center rounded-lg">
                  <Search className="text-primary size-6" />
                </div>
                <CardTitle>Full-Text Search</CardTitle>
                <CardDescription>
                  Built-in search for docs and blog powered by Fumadocs. Fast and accurate content
                  discovery.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="hover:border-primary/50 border-2 transition-colors">
              <CardHeader>
                <div className="bg-primary/10 mb-2 flex size-12 items-center justify-center rounded-lg">
                  <Globe className="text-primary size-6" />
                </div>
                <CardTitle>SEO & Marketing</CardTitle>
                <CardDescription>
                  Meta tags, social media images, sitemaps, robots.txt, and more. SEO optimized out
                  of the box.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="hover:border-primary/50 border-2 transition-colors">
              <CardHeader>
                <div className="bg-primary/10 mb-2 flex size-12 items-center justify-center rounded-lg">
                  <GitBranch className="text-primary size-6" />
                </div>
                <CardTitle>Automated Releases</CardTitle>
                <CardDescription>
                  Automated changelog generation and release workflow. Draft PRs for canary to main
                  and changelog updates.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Why ZeroStarter Section */}
      <section className="bg-muted/30 border-b py-24">
        <div className="container mx-auto max-w-6xl px-5">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">Why ZeroStarter?</h2>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
              Architecture & Best Practices as a Service — ZeroStarter isn't just a starter
              template, it's a complete blueprint for building production-ready SaaS applications.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <CheckCircle2 className="text-primary size-5" />
                </div>
                <div>
                  <h3 className="mb-2 text-lg font-semibold">Modular Architecture</h3>
                  <p className="text-muted-foreground text-sm">
                    Clean, plug-and-play packages that work independently or together. Swap
                    components, extend functionality, or customize without breaking the system.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <CheckCircle2 className="text-primary size-5" />
                </div>
                <div>
                  <h3 className="mb-2 text-lg font-semibold">End-to-End Type Safety</h3>
                  <p className="text-muted-foreground text-sm">
                    Hono RPC ensures type safety from database to frontend. Catch errors at compile
                    time, ship with confidence.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <CheckCircle2 className="text-primary size-5" />
                </div>
                <div>
                  <h3 className="mb-2 text-lg font-semibold">Production-Ready Performance</h3>
                  <p className="text-muted-foreground text-sm">
                    Optimized with Bun runtime and Turborepo for blazing-fast development and
                    builds. Built for scale.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <CheckCircle2 className="text-primary size-5" />
                </div>
                <div>
                  <h3 className="mb-2 text-lg font-semibold">Beautiful UI Out of the Box</h3>
                  <p className="text-muted-foreground text-sm">
                    Shadcn UI components with Tailwind CSS, ready to customize or use as-is. Modern
                    design system included.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <CheckCircle2 className="text-primary size-5" />
                </div>
                <div>
                  <h3 className="mb-2 text-lg font-semibold">Enterprise-Grade Auth</h3>
                  <p className="text-muted-foreground text-sm">
                    Better Auth integration with GitHub, Google, and more — fully configured and
                    ready to extend. Secure by default.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <CheckCircle2 className="text-primary size-5" />
                </div>
                <div>
                  <h3 className="mb-2 text-lg font-semibold">Comprehensive Documentation</h3>
                  <p className="text-muted-foreground text-sm">
                    Every pattern, practice, and decision documented with Fumadocs and AI-optimized
                    llms.txt. Learn as you build.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Code Example Section */}
      <section className="border-b py-24">
        <div className="container mx-auto max-w-6xl px-5">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Type-Safe API Calls
            </h2>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
              Full type inference from backend to frontend. No more manual type definitions. See the
              magic happen.
            </p>
          </div>
        </div>
        <div className="w-full px-5">
          <div className="bg-muted/25 mx-auto w-full max-w-3xl overflow-x-auto rounded-lg border-2 p-5 text-sm">
            <div
              className="[&_pre]:m-0! [&_pre]:overflow-visible! [&_pre]:bg-transparent! [&_pre]:p-0! [&_pre]:font-mono! [&_pre]:text-sm!"
              dangerouslySetInnerHTML={{ __html: typescriptHtml }}
              style={{
                colorScheme: "light dark",
              }}
            />
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-muted/30 border-b py-24">
        <div className="container mx-auto max-w-6xl px-5">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Loved by developers worldwide
            </h2>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
              See why developers are choosing ZeroStarter to accelerate their product launches.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardDescription className="mb-4 text-base">
                  "ZeroStarter sped up my development process significantly. The type-safe API
                  client alone saved me hours of debugging. Highly recommended!"
                </CardDescription>
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 flex size-10 items-center justify-center rounded-full">
                    <Users className="text-primary size-5" />
                  </div>
                  <div>
                    <div className="font-semibold">Developer</div>
                    <div className="text-muted-foreground text-sm">Software Engineer</div>
                  </div>
                </div>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription className="mb-4 text-base">
                  "The monorepo architecture is clean and well-organized. Everything just works out
                  of the box. Best starter kit I've used!"
                </CardDescription>
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 flex size-10 items-center justify-center rounded-full">
                    <Users className="text-primary size-5" />
                  </div>
                  <div>
                    <div className="font-semibold">Builder</div>
                    <div className="text-muted-foreground text-sm">Full Stack Developer</div>
                  </div>
                </div>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription className="mb-4 text-base">
                  "Production-ready from day one. The documentation is excellent and the codebase is
                  maintainable. Exactly what I needed!"
                </CardDescription>
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 flex size-10 items-center justify-center rounded-full">
                    <Users className="text-primary size-5" />
                  </div>
                  <div>
                    <div className="font-semibold">Creator</div>
                    <div className="text-muted-foreground text-sm">Indie Hacker</div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Getting Started Section */}
      <section className="border-b py-24">
        <div className="container mx-auto max-w-6xl px-5">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Get Started in Minutes
            </h2>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
              Clone, install, and start building. It's that simple.
            </p>
          </div>
        </div>
        <div className="w-full px-5">
          <div className="bg-muted/25 mx-auto w-full max-w-3xl overflow-x-auto rounded-lg border-2 p-5 text-sm">
            <div
              className="[&_pre]:m-0! [&_pre]:overflow-visible! [&_pre]:bg-transparent! [&_pre]:p-0! [&_pre]:font-mono! [&_pre]:text-sm!"
              dangerouslySetInnerHTML={{ __html: bashHtml }}
              style={{
                colorScheme: "light dark",
              }}
            />
          </div>
        </div>
        <div className="container mx-auto mt-8 max-w-6xl px-5 text-center">
          <Button asChild size="lg" className="group h-12 px-8 text-base">
            <Link href="/docs">
              Documentation
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-muted/30 border-b py-24">
        <div className="container mx-auto max-w-4xl px-5">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
              Have another question? Check out our documentation or reach out.
            </p>
          </div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-left">What is ZeroStarter?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                ZeroStarter is a modern, type-safe, and high-performance SaaS starter template built
                with a monorepo architecture. It provides everything you need to launch a
                production-ready SaaS application, including authentication, database setup,
                type-safe API client, and beautiful UI components.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-left">
                How is it different from other starter kits?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                ZeroStarter focuses on end-to-end type safety, modular architecture, and
                production-ready patterns. It uses Hono RPC for type-safe APIs, Bun for performance,
                and includes comprehensive documentation with AI-optimized llms.txt. Everything is
                designed to scale and maintain.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-left">Is it production-ready?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes! ZeroStarter is currently in Release Candidate (RC) status. All implemented
                features are stable and production-ready. We're actively adding new features and
                integrations day-by-day. The codebase follows best practices and is battle-tested.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger className="text-left">
                Can I use it for commercial projects?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Absolutely! ZeroStarter is MIT licensed, which means you can use it for any purpose,
                including commercial projects. Build unlimited projects with it.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5">
              <AccordionTrigger className="text-left">
                What technologies does it use?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                ZeroStarter uses Next.js 16, Hono, Bun, Turborepo, Drizzle ORM, Better Auth, Shadcn
                UI, TanStack Query, Zod, Fumadocs, and more. All carefully selected for modern SaaS
                development.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="from-background to-muted/20 bg-linear-to-b py-24">
        <div className="container mx-auto max-w-4xl px-5 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to Build Your SaaS?
          </h2>
          <p className="text-muted-foreground mb-8 text-lg">
            Start building your next project with {config.app.name} today. Skip the complex setups
            and start building features on day one.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="group h-12 px-8 text-base">
              <a href={config.social.github} target="_blank" rel="noopener noreferrer">
                <RiGithubFill className="size-5" />
                Get ZeroStarter
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="group h-12 px-8 text-base">
              <Link href="/docs">
                Documentation
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
          <div className="text-muted-foreground mt-8 flex items-center justify-center gap-2 text-sm">
            <Heart className="size-4 fill-red-500/70 text-red-500/70" />
            <span>
              Made with love by{" "}
              <a
                href="https://twitter.com/nrjdalal"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground font-medium transition-colors"
              >
                @nrjdalal
              </a>
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}
