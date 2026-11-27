"use client"

import { RiCheckLine, RiFileCopyLine } from "@remixicon/react"
import { useEffect, useState } from "react"

import { ShikiRegion } from "@/components/marketing/shiki-region"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"

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
      toast.add({ title: "Could not copy to clipboard", type: "error" })
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={copy}
      aria-label={copied ? `Copied ${label}` : `Copy ${label}`}
      className="-my-1 text-muted-foreground hover:text-foreground"
    >
      {copied ? (
        <RiCheckLine className="size-3.5 text-success" />
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
    <div className="min-w-0 overflow-hidden rounded-lg border bg-card text-left">
      <div className="flex items-center gap-2 border-b bg-card py-2.5 pr-2 pl-4">
        <span className="font-mono text-xs text-muted-foreground">{label}</span>
        <span className="ml-auto">
          <CopyButton code={code} label={label} />
        </span>
      </div>
      <ShikiRegion html={html} label={label} className="[&_pre]:leading-relaxed!" />
    </div>
  )
}
