"use client"

import { RiMoonLine, RiSunLine } from "@remixicon/react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export default function Component() {
  const { theme, setTheme } = useTheme()

  const smartToggle = () => {
    /* The smart toggle by @nrjdalal */
    const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)").matches
    if (theme === "system") {
      setTheme(prefersDarkScheme ? "light" : "dark")
    } else if (
      (theme === "light" && !prefersDarkScheme) ||
      (theme === "dark" && prefersDarkScheme)
    ) {
      setTheme(theme === "light" ? "dark" : "light")
    } else {
      setTheme("system")
    }
  }

  return (
    <Button
      className="size-8 cursor-pointer [&_svg]:!size-4"
      onClick={smartToggle}
      aria-label="Switch between system/light/dark version"
      size="sm"
      variant="outline"
    >
      <RiSunLine className="dark:hidden" aria-hidden="true" />
      <RiMoonLine className="hidden dark:block" aria-hidden="true" />
    </Button>
  )
}
