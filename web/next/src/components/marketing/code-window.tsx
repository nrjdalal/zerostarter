"use client"

import { RiCheckLine, RiFileCopyLine } from "@remixicon/react"
import { useEffect, useState } from "react"

import { ShikiRegion } from "@/components/marketing/shiki-region"
import { Button } from "@/components/ui/button"

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

// `html` is server-highlighted by shiki; `code` is the same source kept raw so it can be copied.
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
