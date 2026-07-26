import { describe, expect, test } from "bun:test"

import { relativeTime } from "../../../../../web/next/src/lib/time"

// Fixed so the assertions describe the function rather than the moment the suite ran.
const NOW = new Date("2026-07-26T12:00:00.000Z")
const ago = (ms: number) => new Date(NOW.getTime() - ms)
const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

describe("relativeTime", () => {
  test("anything inside a minute reads as now, so seconds never render", () => {
    expect(relativeTime(NOW, NOW, "en")).toBe("just now")
    expect(relativeTime(ago(5 * SECOND), NOW, "en")).toBe("just now")
    expect(relativeTime(ago(59 * SECOND), NOW, "en")).toBe("just now")
    expect(relativeTime(new Date(NOW.getTime() + 30 * SECOND), NOW, "en")).toBe("just now")
  })

  test("past the threshold it counts in the largest unit that still fits", () => {
    expect(relativeTime(ago(2 * MINUTE), NOW, "en")).toBe("2 min. ago")
    expect(relativeTime(ago(3 * HOUR), NOW, "en")).toBe("3 hr. ago")
    expect(relativeTime(ago(2 * DAY), NOW, "en")).toBe("2 days ago")
  })

  test("an hour reads as an hour, not as sixty minutes", () => {
    expect(relativeTime(ago(HOUR), NOW, "en")).toBe("1 hr. ago")
  })

  test("takes the string an API sends as readily as a Date", () => {
    expect(relativeTime(ago(5 * MINUTE).toISOString(), NOW, "en")).toBe("5 min. ago")
  })

  test("says nothing rather than Invalid Date when the value is not a time", () => {
    expect(relativeTime("not a date", NOW, "en")).toBe("")
  })

  test("reads the future without inverting the wording", () => {
    expect(relativeTime(new Date(NOW.getTime() + 5 * MINUTE), NOW, "en")).toBe("in 5 min.")
  })
})
