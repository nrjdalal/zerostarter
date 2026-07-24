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
      className="text-muted-foreground hover:text-foreground -my-1 h-7 gap-1.5 px-2 text-xs"
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

// `html` is server-highlighted by shiki; `code` is the same source, kept raw so it can be copied
export function CodeWindow({ label, html, code }: { label: string; html: string; code: string }) {
  return (
    <div className="bg-card min-w-0 overflow-hidden rounded-lg border text-left">
      <div className="bg-card flex items-center gap-2 border-b py-2.5 pr-2 pl-4">
        <span className="text-muted-foreground font-mono text-xs">{label}</span>
        <span className="ml-auto">
          <CopyButton code={code} label={label} />
        </span>
      </div>
      <div
        // tabIndex makes the scroll container reachable, so its overflow can actually be scrolled by keyboard
        tabIndex={0}
        role="region"
        aria-label={label}
        className={cn(
          "focus-visible:ring-ring/50 overflow-x-auto py-5 outline-none focus-visible:ring-2",
          shikiReset,
          "[&_pre]:leading-relaxed!",
        )}
        dangerouslySetInnerHTML={{ __html: html }}
        style={{ colorScheme: "light dark" }}
      />
    </div>
  )
}

export function CodeCard({ html, label }: { html: string; label: string }) {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={label}
      className={cn(
        "bg-background focus-visible:ring-ring/50 flex min-w-0 flex-col justify-center overflow-x-auto rounded-lg border py-5 outline-none focus-visible:ring-2",
        shikiReset,
        "[&_pre]:leading-loose!",
      )}
      dangerouslySetInnerHTML={{ __html: html }}
      style={{ colorScheme: "light dark" }}
    />
  )
}
