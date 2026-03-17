"use client"

import { motion, useMotionValue, useSpring } from "motion/react"
import React, { useCallback, useRef } from "react"

const W = 1450
const H = 260
const FONT = "var(--font-mono), monospace"
const TEXT = "ZEROSTARTER"
const GRAD_R = 250

/**
 * Shared SVG text element used by the wordmark's layered outline and fill effects.
 */
function TextEl(props: React.SVGProps<SVGTextElement>) {
  return (
    <text
      x="50%"
      y="50%"
      textAnchor="middle"
      dominantBaseline="middle"
      fontFamily={FONT}
      fontWeight="900"
      fontSize="220"
      letterSpacing="-0.04em"
      style={{ userSelect: "none" }}
      {...props}
    >
      {TEXT}
    </text>
  )
}

/**
 * Renders an interactive SVG wordmark with a cursor-following radial highlight.
 */
export const Wordmark = () => {
  const svgRef = useRef<SVGSVGElement>(null)

  const rawX = useMotionValue(W / 2)
  const rawY = useMotionValue(H * 3)

  const sx = useSpring(rawX, { stiffness: 60, damping: 20 })
  const sy = useSpring(rawY, { stiffness: 60, damping: 20 })

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!svgRef.current) return
      const r = svgRef.current.getBoundingClientRect()
      rawX.set(((e.clientX - r.left) / r.width) * W)
      rawY.set(((e.clientY - r.top) / r.height) * H)
    },
    [rawX, rawY],
  )

  const onLeave = useCallback(() => {
    rawX.set(W / 2)
    rawY.set(H * 3)
  }, [rawX, rawY])

  const gid = "wm-grad"
  const mid = "wm-mask"

  return (
    // FIX: Set to 110% width and perfectly center it using left-1/2 and -translate-x-1/2.
    // This allows it to scale up 1.1x and bleed beautifully off the edges.
    <div
      className="pointer-events-auto relative left-1/2 w-[110%] -translate-x-1/2 select-none"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <motion.radialGradient id={gid} gradientUnits="userSpaceOnUse" cx={sx} cy={sy} r={GRAD_R}>
            <stop offset="0%" stopColor="currentColor" stopOpacity={1} />
            <stop offset="60%" stopColor="currentColor" stopOpacity={0.6} />
            <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
          </motion.radialGradient>

          <mask id={mid}>
            <rect width="100%" height="100%" fill="black" />
            <motion.circle cx={sx} cy={sy} r={GRAD_R} fill="white" filter="blur(24px)" />
          </mask>
        </defs>

        {/* Layer 1 — skeleton outline */}
        <g className="text-zinc-800 transition-colors duration-300 dark:text-zinc-700">
          <TextEl stroke="currentColor" strokeWidth={1.5} fill="none" />
        </g>

        {/* Layer 2 — cursor-revealed stroke */}
        <g
          mask={`url(#${mid})`}
          className="text-zinc-800 transition-colors duration-300 dark:text-zinc-100"
        >
          <TextEl stroke={`url(#${gid})`} strokeWidth={2.5} fill="none" />
        </g>

        {/* Layer 3 — faint fill wash */}
        <g
          mask={`url(#${mid})`}
          className="text-zinc-800 transition-colors duration-300 dark:text-zinc-100"
        >
          <TextEl fill="currentColor" fillOpacity={0.06} stroke="none" />
        </g>
      </svg>
    </div>
  )
}
