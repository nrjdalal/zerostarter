import { site } from "@packages/config/site"
import type { ReactElement } from "react"
import { render } from "takumi-js"

interface RenderOgImageOptions {
  sectionName?: string
  title: string
  description: string
}

export async function renderOgElement(element: ReactElement): Promise<Response> {
  try {
    const png = await render(element, { width: 1200, height: 630, format: "png" })
    return new Response(new Uint8Array(png), {
      headers: {
        "Cache-Control": "public, immutable, no-transform, max-age=31536000",
        "Content-Type": "image/png",
      },
    })
  } catch (e) {
    if (process.env.NEXT_PHASE === "phase-production-build") throw e
    const cause =
      e instanceof Error && e.cause instanceof Error ? ` | cause: ${e.cause.message}` : ""
    console.error(`og render failed: ${e instanceof Error ? e.message : String(e)}${cause}`)
    return new Response("og render failed", { status: 500 })
  }
}

export async function renderOgImage(options: RenderOgImageOptions): Promise<Response> {
  const { sectionName, title, description } = options
  const label = sectionName ? `${site.name} - ${sectionName}` : site.name
  const titleFontSize = title.length > 50 ? 52 : title.length > 30 ? 64 : 72

  const element = (
    <div
      style={{
        fontSize: 64,
        background: "linear-gradient(135deg, #000 0%, #1a1a1a 100%)",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        color: "white",
        fontFamily: "system-ui",
        padding: 80,
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 28,
          color: "#666",
          marginBottom: 20,
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: titleFontSize,
          fontWeight: "bold",
          marginBottom: 30,
          lineHeight: 1.2,
          maxWidth: 1040,
          background: "linear-gradient(90deg, #fff 0%, #a0a0a0 100%)",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        {title}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 28,
          color: "#a0a0a0",
          lineHeight: 1.4,
          maxWidth: 900,
        }}
      >
        {description}
      </div>
    </div>
  )

  return renderOgElement(element)
}
