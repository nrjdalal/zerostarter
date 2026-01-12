import { ImageResponse } from "@takumi-rs/image-response"
import { notFound } from "next/navigation"

import type { blogSource, docsSource } from "@/lib/source"

import { config } from "@/lib/config"

type Source = typeof blogSource | typeof docsSource

interface OgImageOptions {
  source: Source
  sectionName: string
  defaultTitle: string
  defaultDescription: string
}

export async function generateOgImage(
  slug: string[] | undefined,
  options: OgImageOptions,
): Promise<ImageResponse> {
  const { source, sectionName, defaultTitle, defaultDescription } = options

  const page = source.getPage(slug)
  if (!page) notFound()

  const title = page.data.title || defaultTitle
  const description = page.data.description || defaultDescription

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
        {config.app.name} - {sectionName}
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
