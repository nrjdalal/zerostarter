"use client"

import {
  RiAddLine,
  RiDeleteBinLine,
  RiKey2Line,
  RiLoaderLine,
  RiPencilLine,
} from "@remixicon/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

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
import { authClient } from "@/lib/auth/client"

type Passkey = {
  id: string
  name?: string | null
  createdAt: Date | string
}

function passkeyLabel(passkey: Passkey) {
  return passkey.name || "Passkey"
}

function AddPasskeyDialog() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")

  const addPasskey = useMutation({
    mutationFn: async (value: string) => {
      const res = await authClient.passkey.addPasskey({ name: value })
      if (res && res.error) throw new Error(res.error.message || "Failed to add passkey")
    },
    onSuccess: () => {
      toast.success("Passkey added")
      queryClient.invalidateQueries({ queryKey: ["passkeys"] })
      setName("")
      setOpen(false)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="cursor-pointer" />}>
        <RiAddLine className="size-4" />
        Add passkey
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a passkey</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            addPasskey.mutate(name.trim())
          }}
        >
          <Field>
            <FieldLabel htmlFor="passkey-name">Name</FieldLabel>
            <Input
              id="passkey-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. MacBook Touch ID"
              disabled={addPasskey.isPending}
            />
          </Field>
          <DialogFooter>
            <Button type="submit" className="cursor-pointer" disabled={addPasskey.isPending}>
              {addPasskey.isPending ? <RiLoaderLine className="size-4 animate-spin" /> : null}
              Create passkey
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RenamePasskeyDialog({ passkey }: { passkey: Passkey }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(passkey.name ?? "")

  const renamePasskey = useMutation({
    mutationFn: async (value: string) => {
      const res = await authClient.passkey.updatePasskey({ id: passkey.id, name: value })
      if (res && res.error) throw new Error(res.error.message || "Failed to rename passkey")
    },
    onSuccess: () => {
      toast.success("Passkey renamed")
      queryClient.invalidateQueries({ queryKey: ["passkeys"] })
      setOpen(false)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setName(passkey.name ?? "")
      }}
    >
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon" className="cursor-pointer" aria-label="Rename" />
        }
      >
        <RiPencilLine className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename passkey</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            renamePasskey.mutate(name.trim())
          }}
        >
          <Field>
            <FieldLabel htmlFor={`rename-${passkey.id}`}>Name</FieldLabel>
            <Input
              id={`rename-${passkey.id}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Passkey name"
              disabled={renamePasskey.isPending}
            />
          </Field>
          <DialogFooter>
            <Button type="submit" className="cursor-pointer" disabled={renamePasskey.isPending}>
              {renamePasskey.isPending ? <RiLoaderLine className="size-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeletePasskeyButton({ passkey }: { passkey: Passkey }) {
  const queryClient = useQueryClient()

  const deletePasskey = useMutation({
    mutationFn: async () => {
      const res = await authClient.passkey.deletePasskey({ id: passkey.id })
      if (res && res.error) throw new Error(res.error.message || "Failed to delete passkey")
    },
    onSuccess: () => {
      toast.success("Passkey removed")
      queryClient.invalidateQueries({ queryKey: ["passkeys"] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-destructive cursor-pointer"
      aria-label="Delete"
      disabled={deletePasskey.isPending}
      onClick={() => deletePasskey.mutate()}
    >
      {deletePasskey.isPending ? (
        <RiLoaderLine className="size-4 animate-spin" />
      ) : (
        <RiDeleteBinLine className="size-4" />
      )}
    </Button>
  )
}

export default function PasskeysSettingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["passkeys"],
    queryFn: async () => {
      const res = await authClient.passkey.listUserPasskeys()
      if (res.error) throw new Error(res.error.message || "Failed to load passkeys")
      return res.data
    },
  })

  const passkeys = data ?? []

  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Passkeys</h1>
          <p className="text-muted-foreground text-sm">
            Sign in without a password using Touch ID, Face ID, or a security key.
          </p>
        </div>
        <AddPasskeyDialog />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RiLoaderLine className="text-muted-foreground size-6 animate-spin" />
        </div>
      ) : passkeys.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RiKey2Line className="size-6" />
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
                <RiKey2Line className="size-5" />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{passkeyLabel(passkey)}</ItemTitle>
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
    </main>
  )
}
