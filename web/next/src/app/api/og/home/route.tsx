import { ImageResponse } from "@takumi-rs/image-response"

import { config } from "@/lib/config"

export const dynamic = "force-static"

export async function GET() {
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
          display: "flex",
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
          display: "flex",
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

  imageResponse.headers.set("Cache-Control", "public, immutable, no-transform, max-age=31536000")

  return imageResponse
}
