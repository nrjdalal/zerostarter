import localFont from "next/font/local"

export const dmSans = localFont({
  src: [
    { path: "../fonts/dm-sans-latin-wght-normal.woff2", style: "normal" },
    { path: "../fonts/dm-sans-latin-wght-italic.woff2", style: "italic" },
  ],
  variable: "--font-dm-sans",
  weight: "100 1000",
})

// Next only matches fallbacks against Arial or Times New Roman, so code falls back to the platform monospace instead
export const jetbrainsMono = localFont({
  src: "../fonts/jetbrains-mono-latin-wght-normal.woff2",
  adjustFontFallback: false,
  variable: "--font-jetbrains-mono",
  weight: "100 800",
})
