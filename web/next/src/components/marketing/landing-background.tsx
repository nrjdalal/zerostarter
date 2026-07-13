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
import { gsap } from "gsap"
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
const PEAK_OPACITY = 0.15

const ZeroIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="27 48 186 300"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M120 348L120 348Q91.6 348 70.8 337.2Q50 326.4 38.6 306.8Q27.2 287.2 27.2 260.8L27.2 260.8L27.2 135.2Q27.2 108.8 38.6 89.2Q50 69.6 70.8 58.8Q91.6 48 120 48L120 48Q148.8 48 169.4 58.8Q190 69.6 201.4 89.2Q212.8 108.8 212.8 135.2L212.8 135.2L212.8 260.8Q212.8 287.2 201.4 306.8Q190 326.4 169.2 337.2Q148.4 348 120 348ZM120 304.8L120 304.8Q140.8 304.8 153.2 292.8Q165.6 280.8 165.6 260.8L165.6 260.8L165.6 135.2Q165.6 115.2 153.2 103.2Q140.8 91.2 120 91.2L120 91.2Q99.2 91.2 86.8 103.2Q74.4 115.2 74.4 135.2L74.4 135.2L74.4 260.8Q74.4 280.8 86.8 292.8Q99.2 304.8 120 304.8ZM120 224L120 224Q108.4 224 101 216.4Q93.6 208.8 93.6 196.8L93.6 196.8Q93.6 184.8 100.8 177.6Q108 170.4 120 170.4L120 170.4Q132 170.4 139.2 177.6Q146.4 184.8 146.4 196.8L146.4 196.8Q146.4 208.8 139.2 216.4Q132 224 120 224Z" />
  </svg>
)

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
    const layer = ref.current
    if (!layer) return

    const iconElements = Array.from(layer.children) as HTMLElement[]

    const iconSetters = iconElements.map((el) => ({
      cx: Number(el.dataset.cx),
      cy: Number(el.dataset.cy),
      isRare: el.dataset.rare === "true",
      x: gsap.quickTo(el, "x", { duration: 0.5, ease: "power2.out" }),
      y: gsap.quickTo(el, "y", { duration: 0.5, ease: "power2.out" }),
      scale: gsap.quickTo(el, "scale", { duration: 0.5, ease: "power2.out" }),
      opacity: gsap.quickTo(el, "opacity", { duration: 0.5, ease: "power2.out" }),
    }))

    const onMove = (e: MouseEvent) => {
      const mx = e.clientX
      const my = e.clientY
      const rect = layer.getBoundingClientRect()

      for (const setter of iconSetters) {
        const cx = setter.cx + rect.left
        const cy = setter.cy + rect.top
        const t = Math.max(0, 1 - Math.hypot(cx - mx, cy - my) / RADIUS)

        if (t > 0) {
          const px = (mx - cx) * t * PULL
          const py = (my - cy) * t * PULL
          const peak = setter.isRare ? 0.8 : PEAK_OPACITY
          setter.x(px)
          setter.y(py)
          setter.scale(1 + (MAX_SCALE - 1) * t)
          setter.opacity(BASE_OPACITY + (peak - BASE_OPACITY) * t)
        } else {
          setter.x(0)
          setter.y(0)
          setter.scale(1)
          setter.opacity(BASE_OPACITY)
        }
      }
    }

    window.addEventListener("mousemove", onMove)
    return () => window.removeEventListener("mousemove", onMove)
  }, [dims])

  const cells: ReactNode[] = []
  for (let r = 0; r < dims.rows; r++) {
    for (let c = 0; c < dims.cols; c++) {
      // Deterministic rarity (approx 2% chance of being a Golden Zero)
      const isRareZero = (r * 41 + c * 17) % 100 < 2

      const Icon = isRareZero ? ZeroIcon : ICONS[(r * dims.cols + c) % ICONS.length]
      const x = c * CELL
      const y = r * CELL

      cells.push(
        <span
          key={`${r}-${c}`}
          data-cx={x + CELL / 2}
          data-cy={y + CELL / 2}
          data-rare={isRareZero ? "true" : undefined}
          className="text-foreground absolute flex items-center justify-center"
          style={{
            left: x,
            top: y,
            width: CELL,
            height: CELL,
            opacity: BASE_OPACITY,
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
