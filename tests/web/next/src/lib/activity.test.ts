import { describe, expect, test } from "bun:test"

import { ACTION_LABELS, actionLabel, activityJson } from "../../../../../web/next/src/lib/activity"

describe("actionLabel", () => {
  test("reads a known action by its label", () => {
    expect(actionLabel("role.change")).toBe("Set role")
  })

  test("falls back to the stored code for a verb it has no label for", () => {
    expect(actionLabel("fork.custom")).toBe("fork.custom")
  })

  test("treats a code that names an Object.prototype member as just another unknown code", () => {
    // `in` would find these on the prototype and hand the cell a function instead of a string.
    for (const code of ["constructor", "toString", "hasOwnProperty", "__proto__"]) {
      expect(actionLabel(code)).toBe(code)
    }
  })
})

const event = {
  action: "role.change" as const,
  actor: "taoya@example.com",
  actorId: "d2Tuq5r0MjmFIHkpCyV7dfKptTVsFxLk",
  createdAt: "2026-07-26T12:00:00.000Z",
  id: "9f1c2a44-7b3e-4d21-9d64-2a1b0c8e7f55",
  summary: "Changed ada@example.com from member to admin",
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

  test("reads in the order the row is saying it, ids last", () => {
    // Deliberately not alphabetical: actorId would land between actor and createdAt and summary would fall to the end.
    expect(Object.keys(JSON.parse(activityJson([event]))[0])).toEqual([
      "actor",
      "action",
      "summary",
      "createdAt",
      "actorId",
      "id",
    ])
  })

  test("pins that order whatever order the fields arrive in", () => {
    const shuffled = {
      summary: event.summary,
      id: event.id,
      actor: event.actor,
      createdAt: event.createdAt,
      action: event.action,
      actorId: event.actorId,
    }
    expect(activityJson([shuffled])).toEqual(activityJson([event]))
  })

  test("orders oldest first, whatever order the table handed it", () => {
    // A log read anywhere else reads forwards, and the caller should not have to remember that.
    const older = { ...event, createdAt: "2026-07-25T12:00:00.000Z", id: "older" }
    const rows = JSON.parse(activityJson([event, older]))
    expect(rows.map((row: { id: string }) => row.id)).toEqual(["older", event.id])
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
