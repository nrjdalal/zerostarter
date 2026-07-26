import type { ActivityAction } from "@packages/config/console"

// What each action reads as. Keyed by the action union, so adding one to ACTIVITY_ACTIONS is a compile error here rather than a blank cell.
export const ACTION_LABELS: Record<ActivityAction, string> = {
  "allowlist.add": "Added rule",
  "allowlist.remove": "Removed rule",
  "role.change": "Set role",
  "user.ban": "Banned",
  "user.unban": "Unbanned",
}

// What a copy hands over: the rows exactly as the API returned them, as JSON.
// Not tab separated, because that only means anything if you also know the column order, and the column order is a presentation choice that moves. Field names travel with the data.
// The action stays its stored code rather than its label for the same reason: a copy carries the fact, and ACTION_LABELS is how the fact is displayed.
// Always an array, even for one row, so anything reading it never has to branch on the shape.
export function activityJson(events: unknown[]) {
  return JSON.stringify(events, null, 2)
}
