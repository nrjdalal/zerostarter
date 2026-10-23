import githubDark from "@pierre/highlights/themes/github-dark"
import githubLight from "@pierre/highlights/themes/github-light"
import { createHighlights } from "fumadocs-core/highlight/highlights"

export const highlighter = createHighlights({
  themes: { light: githubLight, dark: githubDark },
})
