"use client"

import { ACCESS_ROLE, roleAtLeast, type ConsoleRole } from "@packages/auth/access"
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
  return { canWrite: roleAtLeast(viewer.role, ACCESS_ROLE), role: viewer.role, viewerId: viewer.id }
}
