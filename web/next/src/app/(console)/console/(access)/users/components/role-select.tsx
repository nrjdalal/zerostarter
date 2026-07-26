"use client"

import { grantableRoles, type ConsoleRole } from "@packages/auth/access"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { Column } from "@tanstack/react-table"
import * as React from "react"

import type { ConsoleUser } from "@/app/(console)/console/(access)/users/components/data-columns"
import { useConsoleRole } from "@/components/console/role"
import { DataTableCellText } from "@/components/data-table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/toast"
import { apiClient, unwrap } from "@/lib/api/client"

// The role cell for someone who may change roles. A member never renders this, and every rule it appears to enforce is enforced again on the API, which refuses with the reason shown here.
export function UserRoleSelect({
  column,
  email,
  role,
  userId,
}: {
  column: Column<ConsoleUser, unknown>
  email: string
  role: string
  userId: string
}) {
  const { canWrite, role: viewerRole, viewerId } = useConsoleRole()
  const queryClient = useQueryClient()
  const [pending, setPending] = React.useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async (next: ConsoleRole) => {
      // A set of one. The route answers per id, so a guard saying no about this account arrives as an outcome rather than an error, and is raised here so the mutation's own error path shows it.
      const { data, error } = await unwrap(
        apiClient.v1.admin.users.role.$patch({ json: { ids: [userId], role: next } }),
      )
      if (error) throw new Error(error.message)
      const [result] = data.results
      if (!result) throw new Error("The account was not changed.")
      if (!result.ok) throw new Error(result.message)
      return next
    },
    onError: (error) => {
      setPending(null)
      toast.add({ title: error.message, type: "error" })
    },
    onSuccess: async (changed) => {
      // Says who, like every other line this table raises, so the toast still means something after you have scrolled away from the row.
      toast.add({ title: `Changed ${email} to ${changed}`, type: "success" })
      // Held until the refetch settles: clearing first would snap the trigger back to the stale role for a beat, which reads as the change failing.
      await queryClient.invalidateQueries({ queryKey: ["console-users"] })
      setPending(null)
    },
  })

  const options = grantableRoles({
    actorRole: viewerRole,
    isSelf: viewerId === userId,
    targetRole: role,
  })
  // Your own row, and anyone you do not outrank, can only ever produce a refusal, so it reads as what it is rather than as a control. Still a table cell, so it keeps the family's truncation and tooltip.
  if (!canWrite || options.length === 0) {
    return (
      <DataTableCellText column={column} className="capitalize">
        {role}
      </DataTableCellText>
    )
  }

  return (
    <Select
      value={pending ? pending : role}
      onValueChange={(next) => {
        // Matched against what this viewer was offered rather than cast: the value arrives as a string, and coercing an unrecognized one would send a rung nobody picked.
        const picked = options.find((option) => option === next)
        if (!picked || picked === role) return
        setPending(picked)
        mutation.mutate(picked)
      }}
    >
      <SelectTrigger
        size="sm"
        aria-label={`Role for ${email}`}
        className="capitalize"
        disabled={mutation.isPending}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((value) => (
          <SelectItem key={value} value={value} className="capitalize">
            {value}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
