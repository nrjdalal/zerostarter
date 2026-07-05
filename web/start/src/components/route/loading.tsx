import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

export function RouteLoading({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <Spinner />
    </div>
  )
}
