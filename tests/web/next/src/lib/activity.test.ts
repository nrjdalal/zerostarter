import { describe, expect, test } from "bun:test"

import { ACTION_LABELS, activityJson } from "../../../../../web/next/src/lib/activity"

const event = {
  action: "role.change" as const,
  actor: "taoya@example.com",
  actorId: "d2Tuq5r0MjmFIHkpCyV7dfKptTVsFxLk",
  createdAt: "2026-07-26T12:00:00.000Z",
  id: "9f1c2a44-7b3e-4d21-9d64-2a1b0c8e7f55",
  summary: "ada@example.com, member to admin",
}

describe("activityJson", () => {
  test("round trips to the same rows, field names and all", () => {
    expect(JSON.parse(activityJson([event]))).toEqual([event])
  })

  test("is always an array, so a reader never branches on one row versus many", () => {
    expect(JSON.parse(activityJson([event]))).toHaveLength(1)
    expect(JSON.parse(activityJson([event, event]))).toHaveLength(2)
    expect(JSON.parse(activityJson([]))).toEqual([])
  })

  test("carries the absolute time, not the relative one the table renders", () => {
    expect(activityJson([event])).toContain("2026-07-26T12:00:00.000Z")
    expect(activityJson([event])).not.toContain("ago")
  })

  test("keeps the stored action code rather than its display label", () => {
    // A copy carries the fact; ACTION_LABELS is how the fact is shown.
    expect(activityJson([event])).toContain("role.change")
    expect(activityJson([event])).not.toContain("Set role")
  })

  test("every action has a label, so no row can render blank", () => {
    for (const label of Object.values(ACTION_LABELS)) {
      expect(label.length).toBeGreaterThan(0)
    }
  })
})
