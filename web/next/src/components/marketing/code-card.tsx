import { ShikiRegion } from "@/components/marketing/shiki-region"

export function CodeCard({ html, label }: { html: string; label: string }) {
  return (
    <ShikiRegion
      html={html}
      label={label}
      className="bg-background flex min-w-0 flex-col justify-center rounded-lg border [&_pre]:leading-loose!"
    />
  )
}
