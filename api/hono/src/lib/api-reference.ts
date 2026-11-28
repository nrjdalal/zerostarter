import { site } from "@packages/config/site"
import type { Context } from "hono"
import { html, raw } from "hono/html"

// Pinned by hand, since deps-manager does not read a CDN URL: bump the version here to take a newer Scalar (https://www.jsdelivr.com/package/npm/@scalar/api-reference).
const SCALAR_ESM_URL = "https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.85.0/esm.js"

const config = {
  _integration: "hono",
  defaultOpenAllTags: true,
  expandAllResponses: true,
  url: "/api/openapi.json",
}

// The dark theme @scalar/hono-api-reference 0.12.26 shipped (MIT, Copyright (c) 2023-present Scalar), kept so the page looks as it did.
const darkTheme = `
.dark-mode {
  --scalar-color-1: rgba(255, 255, 245, .86);
  --scalar-color-2: rgba(255, 255, 245, .6);
  --scalar-color-3: rgba(255, 255, 245, .38);
  --scalar-color-disabled: rgba(255, 255, 245, .25);
  --scalar-color-ghost: rgba(255, 255, 245, .25);
  --scalar-color-accent: #e36002;
  --scalar-background-1: #1e1e20;
  --scalar-background-2: #2a2a2a;
  --scalar-background-3: #505053;
  --scalar-background-4: rgba(255, 255, 255, 0.06);
  --scalar-background-accent: #e360021f;
  --scalar-border-color: rgba(255, 255, 255, 0.1);
  --scalar-scrollbar-color: rgba(255, 255, 255, 0.24);
  --scalar-scrollbar-color-active: rgba(255, 255, 255, 0.48);
  --scalar-backdrop-brightness: 0.5;
  --scalar-shadow-1: 0 1px 3px 0 rgb(0, 0, 0, 0.1);
  --scalar-shadow-2: rgba(15, 15, 15, 0.2) 0px 3px 6px, rgba(15, 15, 15, 0.4) 0px 9px 24px, 0 0 0 1px rgba(255, 255, 255, 0.1);
  --scalar-button-1: #f6f6f6;
  --scalar-button-1-color: #000;
  --scalar-button-1-hover: #e7e7e7;
  --scalar-color-green: #3dd68c;
  --scalar-color-red: #f66f81;
  --scalar-color-yellow: #f9b44e;
  --scalar-color-blue: #788beb;
  --scalar-color-orange: #ff8d4d;
  --scalar-color-purple: #b191f9;
}
.dark-mode .sidebar {
  --scalar-sidebar-background-1: #161618;
  --scalar-sidebar-item-hover-color: var(--scalar-color-accent);
  --scalar-sidebar-item-hover-background: transparent;
  --scalar-sidebar-item-active-background: transparent;
  --scalar-sidebar-border-color: transparent;
  --scalar-sidebar-color-1: var(--scalar-color-1);
  --scalar-sidebar-color-2: var(--scalar-color-2);
  --scalar-sidebar-color-active: var(--scalar-color-accent);
  --scalar-sidebar-search-background: #252529;
  --scalar-sidebar-search-border-color: transparent;
  --scalar-sidebar-search-color: var(--scalar-color-3);
}
`

const page = html`<!doctype html>
  <html>
    <head>
      <title>API Reference | ${site.name}</title>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        ${raw(darkTheme)}
      </style>
    </head>
    <body>
      <div id="app"></div>
      <script type="module">
        import { createApiReference } from "${raw(SCALAR_ESM_URL)}"
        createApiReference("#app", ${raw(JSON.stringify(config))})
      </script>
    </body>
  </html>`

export const apiReference = (c: Context) => c.html(page)
