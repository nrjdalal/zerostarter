import { notFound } from "next/navigation"
import { ImageResponse } from "next/og"

import { config } from "@/lib/config"
import { blogSource } from "@/lib/source"

export const dynamic = "force-static"

export async function GET(_req: Request, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params

  const page = blogSource.getPage(slug)
  if (!page) notFound()

  const title = page.data.title || `${config.app.name} - Blog`
  const description = page.data.description || `Blog post from ${config.app.name}`

  const imageResponse = new ImageResponse(
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
        {config.app.name} - Blog
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 72,
          fontWeight: "bold",
          marginBottom: 30,
          lineHeight: 1.2,
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
    </div>,
    {
      width: 1200,
      height: 630,
    },
  )

  imageResponse.headers.set("Cache-Control", "public, immutable, no-transform, max-age=31536000")

  return imageResponse
}

export function generateStaticParams() {
  return blogSource.generateParams().map((params) => ({
    slug: params.slug ?? [],
  }))
}
