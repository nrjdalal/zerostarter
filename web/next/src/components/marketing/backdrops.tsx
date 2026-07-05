"use client"

import dynamic from "next/dynamic"

// The grain gradient and icon grid are purely decorative (aria-hidden, z-index:-1). Loading them client-only keeps the heavy WebGL loop and the full-page icon grid out of SSR and the initial hydration/network window, so they don't compete with the hero's first paint. The grain already fades in over ~1s, so its slightly later start is imperceptible.
const BackgroundGradient = dynamic(
  () => import("@/components/marketing/background-gradient").then((m) => m.BackgroundGradient),
  { ssr: false },
)

const LandingBackground = dynamic(
  () => import("@/components/marketing/landing-background").then((m) => m.LandingBackground),
  { ssr: false },
)

export function MarketingBackdrops() {
  return (
    <>
      <BackgroundGradient />
      <LandingBackground />
    </>
  )
}
