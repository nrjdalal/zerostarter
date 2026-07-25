"use client"

import { roleAtLeast, type ConsoleRole } from "@packages/auth/access"
import * as React from "react"

// The viewer's platform role, read once on the server by the console layout and handed to client surfaces so a member's mutating controls are never rendered. It decides what to draw, never what is permitted: every gate is enforced again on the API, which is the only place that matters.
const ConsoleRoleContext = React.createContext<ConsoleRole>("user")

export function ConsoleRoleProvider({
  children,
  role,
}: {
  children: React.ReactNode
  role: ConsoleRole
}) {
  return <ConsoleRoleContext value={role}>{children}</ConsoleRoleContext>
}

export function useConsoleRole() {
  const role = React.use(ConsoleRoleContext)
  return { canWrite: roleAtLeast(role, "admin"), role }
}
