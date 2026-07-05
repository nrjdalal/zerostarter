import localFont from "next/font/local"

export const dmSans = localFont({
  src: [
    { path: "../fonts/dm-sans-latin-wght-normal.woff2", style: "normal" },
    { path: "../fonts/dm-sans-latin-wght-italic.woff2", style: "italic" },
  ],
  variable: "--font-dm-sans",
  weight: "100 1000",
})

export const jetbrainsMono = localFont({
  src: "../fonts/jetbrains-mono-latin-wght-normal.woff2",
  variable: "--font-jetbrains-mono",
  weight: "100 800",
})
