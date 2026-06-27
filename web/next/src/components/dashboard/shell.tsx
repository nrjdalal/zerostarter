import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const dashboardShellVariants = cva("mx-auto w-full p-4 sm:p-6", {
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
function DashboardShell({
  className,
  size,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof dashboardShellVariants>) {
  return (
    <div
      data-slot="dashboard-shell"
      className={cn(dashboardShellVariants({ size }), className)}
      {...props}
    />
  )
}

export { DashboardShell, dashboardShellVariants }
