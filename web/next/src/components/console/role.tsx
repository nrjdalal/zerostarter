"use client"

import {
  CONSOLE_ROLES,
  refuseRoleChange,
  roleAtLeast,
  type ConsoleRole,
} from "@packages/auth/access"
import * as React from "react"

// The viewer's platform role and id, read once on the server by the console layout and handed to client surfaces so a member's mutating controls are never rendered, and so a control whose every outcome is a refusal is not drawn at all. It decides what to draw, never what is permitted: every gate is enforced again on the API, which is the only place that matters.
type ConsoleViewer = { id: string; role: ConsoleRole }

const ConsoleRoleContext = React.createContext<ConsoleViewer>({ id: "", role: "user" })

export function ConsoleRoleProvider({
  children,
  id,
  role,
}: {
  children: React.ReactNode
  id: string
  role: ConsoleRole
}) {
  // Memoized on the values, not the object: the provider sits above the whole shell, so a new identity each render would re-render every console surface that reads it.
  const viewer = React.useMemo(() => ({ id, role }), [id, role])
  return <ConsoleRoleContext value={viewer}>{children}</ConsoleRoleContext>
}

export function useConsoleRole() {
  const viewer = React.use(ConsoleRoleContext)
  return { canWrite: roleAtLeast(viewer.role, "admin"), role: viewer.role, viewerId: viewer.id }
}

// The rungs this viewer could actually grant to this target, asked of the same guard the API asks, so the menu and the server can never disagree about the rule. targetIsLastOwner is unknowable here, so a demotion the database refuses can still be offered: that one is a real refusal, not a control that could never work.
export function grantableRoles(input: {
  targetId: string
  targetRole: string | null | undefined
  viewer: { id: string; role: ConsoleRole }
}): ConsoleRole[] {
  return CONSOLE_ROLES.filter(
    (next) =>
      refuseRoleChange({
        actorRole: input.viewer.role,
        isSelf: input.viewer.id === input.targetId,
        nextRole: next,
        targetIsLastOwner: false,
        targetRole: input.targetRole,
      }) === null,
  )
}
