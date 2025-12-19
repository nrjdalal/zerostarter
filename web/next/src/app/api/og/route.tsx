import { notFound } from "next/navigation"
import { ImageResponse } from "next/og"

import { config } from "@/lib/config"
import { source } from "@/lib/source"

export const revalidate = 3600

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get("slug")
  const type = searchParams.get("type") || "home"

  if (type === "home") {
    const imageResponse = new ImageResponse(
      <div
        style={{
          fontSize: 64,
          background: "linear-gradient(135deg, #000 0%, #1a1a1a 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontFamily: "system-ui",
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: "bold",
            marginBottom: 20,
            background: "linear-gradient(90deg, #fff 0%, #a0a0a0 100%)",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {config.app.name}
        </div>
        <div
          style={{
            fontSize: 32,
            color: "#a0a0a0",
            textAlign: "center",
            maxWidth: 800,
            paddingLeft: 40,
            paddingRight: 40,
          }}
        >
          {config.app.description}
        </div>
      </div>,
      {
        width: 1200,
        height: 630,
      },
    )

    imageResponse.headers.set(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400",
    )

    return imageResponse
  }

  let page
  if (slug) {
    const slugArray = slug.split("/").filter(Boolean)
    page = source.getPage(slugArray.length > 0 ? slugArray : undefined)
  } else {
    page = source.getPage(undefined)
  }

  if (!page) notFound()

  const title = page.data.title || `${config.app.name} - Documentation`
  const description = page.data.description || `Documentation for ${config.app.name}`

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
          fontSize: 24,
          color: "#666",
          marginBottom: 20,
          fontWeight: 500,
        }}
      >
        {config.app.name} - Documentation
      </div>
      <div
        style={{
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

  imageResponse.headers.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400")

  return imageResponse
}
