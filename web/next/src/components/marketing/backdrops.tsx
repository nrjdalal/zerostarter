"use client"

import dynamic from "next/dynamic"

// The grain gradient was removed for a cleaner, more premium look.

const LandingBackground = dynamic(
  () => import("@/components/marketing/landing-background").then((m) => m.LandingBackground),
  { ssr: false },
)

export function MarketingBackdrops() {
  return (
    <>
      <LandingBackground />
    </>
  )
}
