"use client"

import { RiCheckLine, RiFileCopyLine } from "@remixicon/react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const shikiReset =
  "[&_pre]:m-0! [&_pre]:overflow-visible! [&_pre]:bg-transparent! [&_pre]:p-0! [&_pre]:font-mono! [&_pre]:text-sm!"

function CopyButton({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={copy}
      aria-label={copied ? `Copied ${label}` : `Copy ${label}`}
      className="text-muted-foreground hover:text-foreground -my-1"
    >
      {copied ? (
        <RiCheckLine className="text-success size-3.5" />
      ) : (
        <RiFileCopyLine className="size-3.5" />
      )}
      <span aria-hidden>{copied ? "Copied" : "Copy"}</span>
    </Button>
  )
}

// `html` is server-highlighted by shiki; `code` is the same source kept raw so it can be copied. Both blocks share one scroll region: it is focusable with an accessible name, since overflow no keyboard can reach is a dead focus stop.
function ShikiRegion({
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

export function CodeWindow({ label, html, code }: { label: string; html: string; code: string }) {
  return (
    <div className="bg-card min-w-0 overflow-hidden rounded-lg border text-left">
      <div className="bg-card flex items-center gap-2 border-b py-2.5 pr-2 pl-4">
        <span className="text-muted-foreground font-mono text-xs">{label}</span>
        <span className="ml-auto">
          <CopyButton code={code} label={label} />
        </span>
      </div>
      <ShikiRegion html={html} label={label} className="[&_pre]:leading-relaxed!" />
    </div>
  )
}

export function CodeCard({ html, label }: { html: string; label: string }) {
  return (
    <ShikiRegion
      html={html}
      label={label}
      className="bg-background flex min-w-0 flex-col justify-center rounded-lg border [&_pre]:leading-loose!"
    />
  )
}
