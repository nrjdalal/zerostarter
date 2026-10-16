import localFont from "next/font/local"

// Author-only fonts for /hire and /resume, kept out of lib/fonts.ts on purpose: next/font scopes a font's preload to the routes whose module graph instantiates it, and the root layout imports lib/fonts.ts, so any font declared there preloads on every page (the landing) and wastes ~116KB. Only these two pages import this module, so their preload stays scoped to /hire and /resume. Wholesale fork-excluded via .gitpickignore.
export const caveat = localFont({
  src: "../../fonts/marketing/caveat-latin-wght-normal.woff2",
  variable: "--font-caveat",
  weight: "400 700",
})

export const lora = localFont({
  src: "../../fonts/marketing/lora-latin-wght-italic.woff2",
  adjustFontFallback: "Times New Roman",
  style: "italic",
  variable: "--font-lora",
  weight: "400 700",
})
