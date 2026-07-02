"use client"

import {
  RiAddLine,
  RiDeleteBinLine,
  RiErrorWarningLine,
  RiKey2Line,
  RiPencilLine,
} from "@remixicon/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { type ReactElement, useState } from "react"
import { toast } from "sonner"

import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Spinner } from "@/components/ui/spinner"
import { authClient } from "@/lib/auth/client"

type Passkey = NonNullable<
  Awaited<ReturnType<typeof authClient.passkey.listUserPasskeys>>["data"]
>[number]

function passkeyLabel(passkey: Passkey) {
  return passkey.name || "Passkey"
}

function PasskeyNameDialog({
  mode,
  initialName,
  trigger,
  onSubmit,
}: {
  mode: "add" | "rename"
  initialName: string
  trigger: ReactElement
  onSubmit: (name: string) => Promise<void>
}) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(initialName)

  const mutation = useMutation({
    mutationFn: onSubmit,
    onSuccess: () => {
      toast.success(mode === "add" ? "Passkey added" : "Passkey renamed")
      queryClient.invalidateQueries({ queryKey: ["passkeys"] })
      setOpen(false)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setName(initialName)
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add a passkey" : "Rename passkey"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate(name.trim())
          }}
        >
          <Field>
            <FieldLabel htmlFor="passkey-name">Name</FieldLabel>
            <Input
              id="passkey-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={mode === "add" ? "e.g. MacBook Touch ID" : "Passkey name"}
              disabled={mutation.isPending}
            />
          </Field>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Spinner /> : null}
              {mode === "add" ? "Create passkey" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AddPasskeyDialog() {
  return (
    <PasskeyNameDialog
      mode="add"
      initialName=""
      trigger={
        <Button>
          <RiAddLine />
          Add passkey
        </Button>
      }
      onSubmit={async (name) => {
        const res = await authClient.passkey.addPasskey(name ? { name } : {})
        if (res.error) throw new Error(res.error.message || "Failed to add passkey")
      }}
    />
  )
}

function RenamePasskeyDialog({ passkey }: { passkey: Passkey }) {
  return (
    <PasskeyNameDialog
      mode="rename"
      initialName={passkey.name ?? ""}
      trigger={
        <Button variant="ghost" size="icon" aria-label="Rename passkey">
          <RiPencilLine />
        </Button>
      }
      onSubmit={async (name) => {
        if (!name) throw new Error("Name cannot be empty")
        const res = await authClient.passkey.updatePasskey({ id: passkey.id, name })
        if (res.error) throw new Error(res.error.message || "Failed to rename passkey")
      }}
    />
  )
}

function DeletePasskeyButton({ passkey }: { passkey: Passkey }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const deletePasskey = useMutation({
    mutationFn: async () => {
      const res = await authClient.passkey.deletePasskey({ id: passkey.id })
      if (res.error) throw new Error(res.error.message || "Failed to delete passkey")
    },
    onSuccess: () => {
      toast.success("Passkey removed")
      queryClient.invalidateQueries({ queryKey: ["passkeys"] })
      setOpen(false)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive"
            aria-label="Delete passkey"
          />
        }
      >
        <RiDeleteBinLine />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete passkey?</AlertDialogTitle>
          <AlertDialogDescription>
            Permanently removes this passkey ({passkeyLabel(passkey)}). If it is your only sign-in
            method, make sure you can still sign in another way.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deletePasskey.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deletePasskey.isPending}
            onClick={() => deletePasskey.mutate()}
          >
            {deletePasskey.isPending ? <Spinner /> : null}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default function PasskeysSettingsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["passkeys"],
    queryFn: async () => {
      const res = await authClient.passkey.listUserPasskeys()
      if (res.error) throw new Error(res.error.message || "Failed to load passkeys")
      return res.data
    },
  })

  const passkeys = data ?? []

  return (
    <DashboardShell size="sm">
      <DashboardHeader
        title="Passkeys"
        description="Sign in without a password using Touch ID, Face ID, or a security key."
        actions={<AddPasskeyDialog />}
      />

      {isLoading ? (
        <div className="text-muted-foreground flex items-center justify-center py-12">
          <Spinner />
        </div>
      ) : isError ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RiErrorWarningLine />
            </EmptyMedia>
            <EmptyTitle>Unable to load passkeys</EmptyTitle>
            <EmptyDescription>
              Something went wrong loading your passkeys. Refresh the page to try again.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : passkeys.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RiKey2Line />
            </EmptyMedia>
            <EmptyTitle>No passkeys yet</EmptyTitle>
            <EmptyDescription>
              Add a passkey to sign in faster and more securely on this device.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <AddPasskeyDialog />
          </EmptyContent>
        </Empty>
      ) : (
        <ItemGroup>
          {passkeys.map((passkey) => (
            <Item key={passkey.id} variant="outline">
              <ItemMedia variant="icon">
                <RiKey2Line />
              </ItemMedia>
              <ItemContent>
                <div className="flex items-center gap-2">
                  <ItemTitle>{passkeyLabel(passkey)}</ItemTitle>
                  <Badge variant="secondary">{passkey.backedUp ? "Synced" : "This device"}</Badge>
                </div>
                <ItemDescription>
                  Added {new Date(passkey.createdAt).toLocaleDateString()}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <RenamePasskeyDialog passkey={passkey} />
                <DeletePasskeyButton passkey={passkey} />
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      )}
    </DashboardShell>
  )
}
