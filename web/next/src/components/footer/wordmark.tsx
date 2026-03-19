"use client"

import type { MouseEvent, SVGProps } from "react"
import { useCallback, useEffect, useId, useRef } from "react"

import { config } from "@/lib/config"

const W = 1450
const H = 260
const FONT = "var(--font-mono), monospace"
const GRAD_R = 250

function TextEl({ children, ...props }: SVGProps<SVGTextElement>) {
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
      {children}
    </text>
  )
}

export function Wordmark() {
  const text = config.app.name.toUpperCase()
  const instanceId = useId().replace(/:/g, "")
  const svgRef = useRef<SVGSVGElement>(null)
  const gradientRef = useRef<SVGRadialGradientElement>(null)
  const circleRef = useRef<SVGCircleElement>(null)

  const setPosition = useCallback((x: number, y: number) => {
    gradientRef.current?.setAttribute("cx", `${x}`)
    gradientRef.current?.setAttribute("cy", `${y}`)
    circleRef.current?.setAttribute("cx", `${x}`)
    circleRef.current?.setAttribute("cy", `${y}`)
  }, [])

  const onMove = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!svgRef.current) return

      const rect = svgRef.current.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * W
      const y = ((event.clientY - rect.top) / rect.height) * H

      setPosition(x, y)
    },
    [setPosition],
  )

  const onLeave = useCallback(() => {
    setPosition(W / 2, H * 3)
  }, [setPosition])

  useEffect(() => {
    setPosition(W / 2, H * 3)
  }, [setPosition])

  const gid = `${instanceId}-wm-grad`
  const mid = `${instanceId}-wm-mask`

  return (
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
          <radialGradient
            ref={gradientRef}
            id={gid}
            gradientUnits="userSpaceOnUse"
            cx={W / 2}
            cy={H * 3}
            r={GRAD_R}
          >
            <stop offset="0%" stopColor="currentColor" stopOpacity={1} />
            <stop offset="60%" stopColor="currentColor" stopOpacity={0.72} />
            <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
          </radialGradient>

          <mask id={mid}>
            <rect width="100%" height="100%" fill="black" />
            <circle
              ref={circleRef}
              cx={W / 2}
              cy={H * 3}
              r={GRAD_R}
              fill="white"
              filter="blur(24px)"
            />
          </mask>
        </defs>

        <g className="text-zinc-700 transition-colors duration-300 dark:text-zinc-500">
          <TextEl stroke="currentColor" strokeWidth={1.5} fill="none">
            {text}
          </TextEl>
        </g>

        <g
          mask={`url(#${mid})`}
          className="text-zinc-700 transition-colors duration-300 dark:text-zinc-50"
        >
          <TextEl stroke={`url(#${gid})`} strokeWidth={2.5} fill="none">
            {text}
          </TextEl>
        </g>

        <g
          mask={`url(#${mid})`}
          className="text-zinc-700 transition-colors duration-300 dark:text-zinc-50"
        >
          <TextEl fill="currentColor" fillOpacity={0.1} stroke="none">
            {text}
          </TextEl>
        </g>
      </svg>
    </div>
  )
}
