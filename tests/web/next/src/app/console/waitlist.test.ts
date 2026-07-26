import { describe, expect, test } from "bun:test"

import { waitlistEmails } from "../../../../../../web/next/src/app/(console)/console/waitlist/components/data-table"

describe("waitlistEmails", () => {
  const signups = [
    { createdAt: "2026-07-20T10:00:00.000Z", email: "second@example.com" },
    { createdAt: "2026-07-19T10:00:00.000Z", email: "first@example.com" },
  ]

  test("one address per line, so it pastes into whatever sends the mail", () => {
    expect(waitlistEmails(signups)).toBe("first@example.com\nsecond@example.com")
  })

  test("oldest first, whatever order the table is sorted in", () => {
    // The table shows newest first; a mailing list reads forwards.
    expect(waitlistEmails([...signups].reverse())).toBe("first@example.com\nsecond@example.com")
  })

  test("carries no field names, unlike the activity copy", () => {
    expect(waitlistEmails(signups)).not.toContain("email")
  })

  test("an empty selection copies nothing rather than a stray newline", () => {
    expect(waitlistEmails([])).toBe("")
  })
})
