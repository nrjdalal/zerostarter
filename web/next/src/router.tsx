import { createRouter } from "@tanstack/react-router"

import { RouteError } from "@/components/route/error"
import { RouteLoading } from "@/components/route/loading"
import { RouteNotFound } from "@/components/route/not-found"

import { routeTree } from "./routeTree.gen"

export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    // Next auto-wired error.tsx/loading.tsx/not-found.tsx; TanStack needs these set explicitly, else it falls back to unstyled defaults (and warns on an unconfigured notFoundComponent).
    defaultErrorComponent: RouteError,
    defaultPendingComponent: RouteLoading,
    defaultNotFoundComponent: () => <RouteNotFound />,
  })

  return router
}
