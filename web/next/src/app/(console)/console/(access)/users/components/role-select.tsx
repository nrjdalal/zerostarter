"use client"

import { grantableRoles, type ConsoleRole } from "@packages/auth/access"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { Column } from "@tanstack/react-table"
import * as React from "react"
import { toast } from "sonner"

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
      const { data, error } = await unwrap(
        apiClient.v1.admin.users[":id"].role.$patch({
          json: { role: next },
          param: { id: userId },
        }),
      )
      if (error) throw new Error(error.message)
      return data
    },
    onError: (error) => {
      setPending(null)
      toast.error(error.message)
    },
    onSuccess: async (data) => {
      toast.success(`Role changed to ${data.user.role}`)
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
