"use client"

import { RiCheckLine, RiFileCopyLine } from "@remixicon/react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface CopyAsMarkdownProps {
  url: string
}

export function CopyAsMarkdown({ url }: CopyAsMarkdownProps) {
  const [isCopied, setIsCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleCopy = async () => {
    try {
      setIsLoading(true)

      const llmsUrl = url.replace(/^\/docs/, "/llms.txt/docs")

      const response = await fetch(llmsUrl)
      if (!response.ok) {
        throw new Error("Failed to fetch markdown")
      }

      const markdown = await response.text()

      await navigator.clipboard.writeText(markdown)
      setIsCopied(true)

      setTimeout(() => {
        setIsCopied(false)
      }, 2000)
    } catch (error) {
      console.error("Failed to copy markdown:", error)
      toast.error("Failed to copy markdown")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleCopy}
            disabled={isLoading}
            className="ml-1 size-8"
            aria-label="Copy as markdown"
          />
        }
      >
        {isCopied ? <RiCheckLine className="size-4" /> : <RiFileCopyLine className="size-4" />}
      </TooltipTrigger>
      <TooltipContent>{isCopied ? "Copied as markdown" : "Copy as markdown"}</TooltipContent>
    </Tooltip>
  )
}
