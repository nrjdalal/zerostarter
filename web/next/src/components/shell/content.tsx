import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const pageShellVariants = cva("mx-auto w-full p-4 sm:p-6", {
  variants: {
    size: {
      sm: "max-w-2xl",
      md: "max-w-4xl",
      lg: "max-w-6xl",
      full: "max-w-none",
    },
  },
  defaultVariants: {
    size: "md",
  },
})

// The content container for a protected (dashboard/console) page: owns centering, width, and padding so pages never hand-roll mx-auto/max-w/p-* classes.
function PageShell({
  className,
  size,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof pageShellVariants>) {
  return (
    <div data-slot="page-shell" className={cn(pageShellVariants({ size }), className)} {...props} />
  )
}

// The title/description/actions row for a protected page: owns the heading typography and spacing so pages never hand-roll the header layout.
function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div
      data-slot="page-header"
      className={cn("mb-6 flex items-start justify-between gap-4", className)}
    >
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{title}</h1>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export { PageHeader, PageShell, pageShellVariants }
