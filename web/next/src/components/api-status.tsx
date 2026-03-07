"use client"

import { useQuery } from "@tanstack/react-query"

import { apiClient } from "@/lib/api/client"

export function ApiStatus() {
  const { isLoading, isError } = useQuery({
    queryKey: ["api-health"],
    queryFn: async () => {
      const res = await apiClient.health.$get()
      if (!res.ok) {
        throw new Error("Systems are facing issues")
      }
      return res.json()
    },
    refetchInterval: 30000,
  })

  if (isLoading) {
    return (
      <div
        role="status"
        aria-label="API status"
        className="invisible flex h-8 items-center justify-center gap-2 rounded-full border px-4 py-1.5 text-sm"
      >
        <div className="size-2 shrink-0 rounded-full" />
        <span className="w-45 text-center">All systems are operational</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div
        role="status"
        aria-label="API status"
        className="bg-destructive/10 text-destructive border-destructive/20 animate-in fade-in flex h-8 items-center justify-center gap-2 rounded-full border px-4 py-1.5 text-sm duration-2000"
      >
        <div className="bg-destructive size-2 shrink-0 rounded-full" />
        <span className="w-45 text-center">Systems are facing issues</span>
      </div>
    )
  }

  return (
    <div
      role="status"
      aria-label="API status"
      className="animate-in fade-in flex h-8 items-center justify-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-4 py-1.5 text-sm text-green-600 duration-2000 dark:text-green-400"
    >
      <div className="size-2 shrink-0 rounded-full bg-green-500" />
      <span className="w-45 text-center">All systems are operational</span>
    </div>
  )
}
