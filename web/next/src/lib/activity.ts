import { ACTIVITY_ACTIONS, type ActivityAction } from "@packages/config/console"

// What each action reads as. Keyed by the action union, so adding one to ACTIVITY_ACTIONS is a compile error here rather than a blank cell.
export const ACTION_LABELS: Record<ActivityAction, string> = {
  "allowlist.add": "Added rule",
  "allowlist.remove": "Removed rule",
  "role.change": "Set role",
  "user.ban": "Banned",
  "user.unban": "Unbanned",
  "waitlist.remove": "Removed signup",
}

// How an action reads, falling back to the stored code. A row keeps whatever verb was written, so a label may not exist for it: a fork's own verb, or one retired after rows already carried it. Showing the code is honest, and inventing a label is not.
export function actionLabel(action: string) {
  return action in ACTION_LABELS ? ACTION_LABELS[action as ActivityAction] : action
}

// The filter's options, labelled through the map above rather than through facetOptions, which upper-cases the first letter and would offer "Role.change" beside a column reading "Set role".
export const actionOptions = ACTIVITY_ACTIONS.map((value) => ({
  label: ACTION_LABELS[value],
  value,
}))

// What a copy hands over: the rows as JSON.
// Not tab separated, because that only means anything if you also know the column order, and the column order is a presentation choice that moves. Field names travel with the data.
// The action stays its stored code rather than its label for the same reason: a copy carries the fact, and ACTION_LABELS is how the fact is displayed.
// Always an array, even for one row, so anything reading it never has to branch on the shape.
// Fields are rebuilt in reading order rather than passed through, which is the same relevance-before-alphabetical trade the API's paged payloads make: alphabetical wedges actorId between actor and createdAt and leaves summary last, so the sentence the row is saying arrives out of order. Written this way a row reads who did what, to what, and when, then carries the two ids for whatever is on the other end of the paste. It also pins the order, so it no longer follows whatever order the API happened to select in.
// Oldest first, whatever order the table is sorted in: a log read anywhere else reads forwards. Sorted here rather than by the caller, so the ordering lives with the format, like waitlistEmails.
export function activityJson<
  T extends {
    action: string
    actor: string
    actorId: null | string
    createdAt: string
    id: string
    summary: string
  },
>(events: T[]) {
  const ordered = [...events]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((event) => ({
      actor: event.actor,
      action: event.action,
      summary: event.summary,
      createdAt: event.createdAt,
      actorId: event.actorId,
      id: event.id,
    }))
  return JSON.stringify(ordered, null, 2)
}
