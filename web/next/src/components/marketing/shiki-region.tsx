import { cn } from "@/lib/utils"

const shikiReset =
  "[&_pre]:m-0! [&_pre]:overflow-visible! [&_pre]:bg-transparent! [&_pre]:p-0! [&_pre]:font-mono! [&_pre]:text-sm!"

// Focusable with an accessible name, since overflow no keyboard can reach is a dead focus stop.
export function ShikiRegion({
  html,
  label,
  className,
}: {
  html: string
  label: string
  className?: string
}) {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={label}
      className={cn(
        "focus-visible:ring-ring/50 overflow-x-auto py-5 outline-none focus-visible:ring-2",
        shikiReset,
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
      style={{ colorScheme: "light dark" }}
    />
  )
}
