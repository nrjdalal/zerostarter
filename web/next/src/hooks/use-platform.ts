"use client"

import * as React from "react"

function getIsMac(): boolean {
  if (typeof window === "undefined") return false
  return (
    navigator.platform.toUpperCase().indexOf("MAC") >= 0 ||
    navigator.userAgent.toUpperCase().indexOf("MAC") >= 0
  )
}

export function useIsMac() {
  const [isMac] = React.useState(() => getIsMac())

  return isMac
}
