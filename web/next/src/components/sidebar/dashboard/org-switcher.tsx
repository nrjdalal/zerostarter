"use client"

import { RiAddLine, RiBuildingLine, RiExpandUpDownLine, RiLoaderLine } from "@remixicon/react"
import { useForm } from "@tanstack/react-form"
import { useState } from "react"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar"
import { authClient } from "@/lib/auth/client"
import { cn } from "@/lib/utils"

type Organization = {
  id: string
  name: string
  slug: string
  logo?: string | null
}

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  slug: z.string(),
})

export function SidebarDashboardOrgSwitcher() {
  const { isMobile } = useSidebar()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const { data: orgs, refetch: refetchOrgs } = authClient.useListOrganizations()
  const { data: activeOrg, refetch: refetchActiveOrg } = authClient.useActiveOrganization()

  const form = useForm({
    defaultValues: {
      name: "",
      slug: "",
    },
    validators: {
      onSubmit: formSchema,
      onChange: formSchema,
      onBlur: formSchema,
    },
    onSubmit: async ({ value }) => {
      const slug = value.slug.trim() || value.name.toLowerCase().replace(/\s+/g, "-")
      const result = await authClient.organization.create({
        name: value.name.trim(),
        slug,
      })

      if (result.error) {
        toast.error(result.error.message || "Failed to create organization")
        return
      }

      if (result.data) {
        await authClient.organization.setActive({ organizationId: result.data.id })
        refetchOrgs()
        refetchActiveOrg()
        setCreateDialogOpen(false)
        form.reset()
        toast.success("Organization created!")
      }
    },
  })

  const handleSetActive = async (organizationId: string) => {
    await authClient.organization.setActive({ organizationId })
    refetchActiveOrg()
  }

  const organizations: Organization[] = orgs ?? []

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer border"
            />
          }
        >
          <div className="bg-sidebar-accent text-sidebar-accent-foreground flex aspect-square size-8 items-center justify-center rounded-md">
            <RiBuildingLine className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{activeOrg?.name ?? "Select Organization"}</span>
            <span className="text-muted-foreground truncate text-xs">
              {activeOrg?.slug ?? "No organization selected"}
            </span>
          </div>
          <RiExpandUpDownLine className="ml-auto size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className={cn("w-(--anchor-width) min-w-56 rounded-lg", isMobile ? "mb-1" : "ml-3")}
          side={isMobile ? "bottom" : "right"}
          align="start"
          sideOffset={4}
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <div className="bg-sidebar-accent text-sidebar-accent-foreground flex size-8 items-center justify-center rounded-md">
                  <RiBuildingLine className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {activeOrg?.name ?? "No organization"}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    {activeOrg?.slug ?? "Create one to get started"}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          {organizations
            .filter((org) => org.id !== activeOrg?.id)
            .map((org) => (
              <DropdownMenuItem
                key={org.id}
                className="cursor-pointer"
                onClick={() => handleSetActive(org.id)}
              >
                <RiBuildingLine />
                {org.name}
              </DropdownMenuItem>
            ))}
          <DropdownMenuItem className="cursor-pointer" onClick={() => setCreateDialogOpen(true)}>
            <RiAddLine />
            Create organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open)
          if (!open) form.reset()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create organization</DialogTitle>
            <DialogDescription>
              Create a new organization to collaborate with others.
            </DialogDescription>
          </DialogHeader>
          <form
            id="create-org"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              form.handleSubmit()
            }}
          >
            <FieldGroup>
              <form.Field name="name">
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        className="focus:placeholder:opacity-0"
                        placeholder="Acme Inc."
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        disabled={form.state.isSubmitting}
                      />
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  )
                }}
              </form.Field>
              <form.Field name="slug">
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Slug</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        className="focus:placeholder:opacity-0"
                        placeholder="acme"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        disabled={form.state.isSubmitting}
                      />
                      <FieldDescription>Leave empty to auto-generate from name.</FieldDescription>
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  )
                }}
              </form.Field>
            </FieldGroup>
            <Button
              type="submit"
              variant="secondary"
              className="w-full cursor-pointer"
              disabled={form.state.isSubmitting}
            >
              {form.state.isSubmitting ? <RiLoaderLine className="size-5 animate-spin" /> : null}
              Create organization
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
