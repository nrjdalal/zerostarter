"use client"

import {
  RiBookOpenLine,
  RiDatabase2Line,
  RiGitForkLine,
  RiGlobalLine,
  RiGroupLine,
  RiLockLine,
  RiRobot2Line,
  RiRocketLine,
  RiShieldKeyholeLine,
  RiSpeedLine,
  RiStackLine,
} from "@remixicon/react"
import { type ReactNode, useEffect, useRef, useState } from "react"

// The landing's feature icons, tiled across the page as a background that leans toward the cursor.
const ICONS = [
  RiRobot2Line,
  RiRocketLine,
  RiLockLine,
  RiDatabase2Line,
  RiShieldKeyholeLine,
  RiSpeedLine,
  RiGroupLine,
  RiGlobalLine,
  RiBookOpenLine,
  RiStackLine,
  RiGitForkLine,
]

const CELL = 80
const RADIUS = 192
const MAX_SCALE = 2.2
const PULL = 0.4 // how far a nearby icon slides toward the cursor
const BASE_OPACITY = 0
const PEAK_OPACITY = 0.1

export function LandingBackground() {
  const [dims, setDims] = useState({ cols: 0, rows: 0 })
  const ref = useRef<HTMLDivElement>(null)

  // Fill the full page height (the layer is absolute inside main), re-measured as content grows.
  useEffect(() => {
    const parent = ref.current?.parentElement
    if (!parent) return
    const measure = () => {
      const cols = Math.ceil(window.innerWidth / CELL) + 1
      const rows = Math.ceil(parent.scrollHeight / CELL) + 1
      setDims((prev) => (prev.cols === cols && prev.rows === rows ? prev : { cols, rows }))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(parent)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let raf = 0
    const onMove = (e: MouseEvent) => {
      const mx = e.clientX
      const my = e.clientY
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const layer = ref.current
        if (!layer) return
        // The layer scrolls with the page, so offset icon positions by its live viewport rect.
        const rect = layer.getBoundingClientRect()
        for (const node of Array.from(layer.children)) {
          const el = node as HTMLElement
          const cx = Number(el.dataset.cx) + rect.left
          const cy = Number(el.dataset.cy) + rect.top
          const t = Math.max(0, 1 - Math.hypot(cx - mx, cy - my) / RADIUS)
          const px = (mx - cx) * t * PULL
          const py = (my - cy) * t * PULL
          el.style.transform = `translate(${px}px, ${py}px) scale(${1 + (MAX_SCALE - 1) * t})`
          el.style.opacity = `${BASE_OPACITY + (PEAK_OPACITY - BASE_OPACITY) * t}`
        }
      })
    }
    window.addEventListener("mousemove", onMove)
    return () => {
      window.removeEventListener("mousemove", onMove)
      cancelAnimationFrame(raf)
    }
  }, [dims])

  const cells: ReactNode[] = []
  for (let r = 0; r < dims.rows; r++) {
    for (let c = 0; c < dims.cols; c++) {
      const Icon = ICONS[(r * dims.cols + c) % ICONS.length]
      const x = c * CELL
      const y = r * CELL
      cells.push(
        <span
          key={`${r}-${c}`}
          data-cx={x + CELL / 2}
          data-cy={y + CELL / 2}
          className="text-foreground absolute flex items-center justify-center"
          style={{
            left: x,
            top: y,
            width: CELL,
            height: CELL,
            opacity: BASE_OPACITY,
            transition: "transform .75s ease-out, opacity .75s ease-out",
          }}
        >
          <Icon className="size-5" />
        </span>,
      )
    }
  }

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: -1 }}
    >
      {cells}
    </div>
  )
}
