"use client"
"use no memo"

import { parseAllowlistRule } from "@packages/auth/access"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import * as React from "react"
import { toast } from "sonner"

import {
  allowlistColumnConfig,
  allowlistColumns,
  describeRule,
  type AllowlistRuleRow,
} from "@/app/(console)/console/(access)/allowlist/components/data-columns"
import { useConsoleRole } from "@/components/console/role"
import {
  DataTable,
  DataTableFacetedFilter,
  DataTableToolbar,
  useDataTable,
  type DataTablePage,
  type DataTablePageInput,
} from "@/components/data-table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { apiClient, unwrap } from "@/lib/api/client"

const DEFAULT_SORTING = [{ desc: false, id: "value" }]
const KIND_OPTIONS = [
  { label: "Domain", value: "domain" },
  { label: "Email", value: "email" },
]
const KIND_VALUES = new Set(KIND_OPTIONS.map((option) => option.value))
// Mirrors the endpoint's q cap so a hand-written URL cannot 400 the table.
const Q_MAX = 254

async function fetchRules({
  filters,
  page,
  perPage,
  search,
}: DataTablePageInput): Promise<DataTablePage<AllowlistRuleRow>> {
  const kinds = filters.kind ? filters.kind.filter((kind) => KIND_VALUES.has(kind)) : []
  const { data, error } = await unwrap(
    apiClient.v1.admin.allowlist.$get({
      query: {
        kind: kinds.length ? kinds.join(",") : undefined,
        page: `${page}`,
        perPage: `${perPage}`,
        q: search ? search.slice(0, Q_MAX) : undefined,
      },
    }),
  )
  if (error) throw new Error(error.message)
  return { rows: data.rules, total: data.total }
}

// The rules deciding who may create an account. Reading is a member power, changing is an admin one, so the add and remove affordances are absent below that rung.
export function AllowlistDataTable() {
  const { canWrite } = useConsoleRole()
  const queryClient = useQueryClient()
  const [pendingDelete, setPendingDelete] = React.useState<AllowlistRuleRow | null>(null)

  const columns = React.useMemo(() => allowlistColumns(setPendingDelete), [])
  const { table, tableProps } = useDataTable({
    columnConfig: allowlistColumnConfig,
    columns,
    defaultSorting: DEFAULT_SORTING,
    fetchPage: fetchRules,
    filterIds: ["kind"],
    getRowId: (row) => row.id,
    queryKey: "console-allowlist",
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["console-allowlist"] })

  const remove = useMutation({
    mutationFn: async (rule: AllowlistRuleRow) => {
      const { error } = await unwrap(
        apiClient.v1.admin.allowlist[":id"].$delete({ param: { id: rule.id } }),
      )
      if (error) throw new Error(error.message)
    },
    onError: (error) => toast.error(error.message),
    onSuccess: () => {
      setPendingDelete(null)
      toast.success("Rule removed")
      refresh()
    },
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <DataTableToolbar table={table} searchMaxLength={Q_MAX} searchPlaceholder="Search rules...">
        <DataTableFacetedFilter
          column={table.getColumn("kind")}
          options={KIND_OPTIONS}
          title="Kind"
        />
        {canWrite && <AddRuleDialog onAdded={refresh} />}
      </DataTableToolbar>
      <DataTable
        {...tableProps}
        aria-label="Allowlist"
        empty={
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No rules yet</EmptyTitle>
              <EmptyDescription>
                Anyone can sign up. Add a rule to restrict who may create an account.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      />
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {pendingDelete?.value}?</AlertDialogTitle>
            <AlertDialogDescription>
              Existing accounts keep working. If this is the last rule, anyone will be able to sign
              up again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              onClick={() => pendingDelete && remove.mutate(pendingDelete)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// One field, because a rule is one string. The preview says who it will admit before it is added.
function AddRuleDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState("")
  const parsed = parseAllowlistRule(value)

  const create = useMutation({
    mutationFn: async (input: string) => {
      const { data, error } = await unwrap(
        apiClient.v1.admin.allowlist.$post({ json: { value: input } }),
      )
      if (error) throw new Error(error.message)
      return data
    },
    onError: (error) => toast.error(error.message),
    onSuccess: (data) => {
      setOpen(false)
      setValue("")
      toast.success(`${data.rule.value} added`)
      onAdded()
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setValue("")
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>Add rule</DialogTrigger>
      <DialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (parsed) create.mutate(value)
          }}
        >
          <DialogHeader>
            <DialogTitle>Add a rule</DialogTitle>
            <DialogDescription>
              A domain admits everyone at it; an address admits one person.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="allowlist-value">Domain or email address</FieldLabel>
              <Input
                id="allowlist-value"
                autoComplete="off"
                maxLength={Q_MAX}
                placeholder="@example.com"
                value={value}
                onChange={(event) => setValue(event.target.value)}
              />
              <p className="text-muted-foreground text-sm">
                {value.trim() === ""
                  ? "For example @example.com, or ada@example.com."
                  : parsed
                    ? describeRule(parsed)
                    : "Enter a domain like @example.com or a full email address."}
              </p>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button type="submit" disabled={!parsed || create.isPending}>
              Add rule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
