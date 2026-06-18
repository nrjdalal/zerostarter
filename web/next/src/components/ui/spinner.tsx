import { RiLoaderLine, type RemixiconComponentType } from "@remixicon/react"

import { cn } from "@/lib/utils"

function Spinner({ className, ...props }: React.ComponentProps<RemixiconComponentType>) {
  return (
    <RiLoaderLine
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
