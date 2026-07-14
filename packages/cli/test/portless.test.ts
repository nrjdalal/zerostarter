import { expect, test } from "bun:test"

import { deriveUrls } from "../../../.github/scripts/portless"

// Main checkout (no branch prefix): web `zerostarter.localhost`, api `api.zerostarter.localhost`.
test("deriveUrls toggles the api label from the web host (main checkout)", () => {
  expect(deriveUrls("http://zerostarter.localhost:1355")).toEqual({
    web: "http://zerostarter.localhost:1355",
    api: "http://api.zerostarter.localhost:1355",
  })
})

test("deriveUrls toggles the api label from the api host (main checkout)", () => {
  expect(deriveUrls("http://api.zerostarter.localhost:1355")).toEqual({
    web: "http://zerostarter.localhost:1355",
    api: "http://api.zerostarter.localhost:1355",
  })
})

// Worktree (api-first): web `feat.zerostarter.localhost`, api `api.feat.zerostarter.localhost`.
test("deriveUrls handles the branch-prefixed web host (worktree)", () => {
  expect(deriveUrls("http://feat.zerostarter.localhost:1355")).toEqual({
    web: "http://feat.zerostarter.localhost:1355",
    api: "http://api.feat.zerostarter.localhost:1355",
  })
})

test("deriveUrls handles the branch-prefixed api host (worktree)", () => {
  expect(deriveUrls("http://api.feat.zerostarter.localhost:1355")).toEqual({
    web: "http://feat.zerostarter.localhost:1355",
    api: "http://api.feat.zerostarter.localhost:1355",
  })
})
