"use client"

import {
  RiAddLine,
  RiCheckLine,
  RiExpandUpDownLine,
  RiLoader4Line,
  RiTeamLine,
} from "@remixicon/react"
import { useForm } from "@tanstack/react-form"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { apiClient } from "@/lib/api/client"
import { cn } from "@/lib/utils"

const formSchema = z.object({
  name: z
    .string()
    .min(2, "Organization name must be at least 2 characters.")
    .max(32, "Organization name must be at most 32 characters."),
  slug: z
    .string()
    .min(2, "URL slug must be at least 2 characters.")
    .max(32, "URL slug must be at most 32 characters.")
    .regex(/^[a-z0-9-]+$/, "URL slug can only contain lowercase letters, numbers, and hyphens."),
})

function CreateOrganizationDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}) {
  const router = useRouter()

  const form = useForm({
    defaultValues: {
      name: "",
      slug: "",
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      const response = await apiClient.v1.organization.$post({
        json: { name: value.name, slug: value.slug },
      })

      if (!response.ok) {
        const { error } = await response.json()
        toast.error(error.message ?? "Something went wrong")
        return
      }

      const { data: organization } = await response.json()
      toast.success(`Organization ${organization.name} created successfully`)

      form.reset()
      onOpenChange(false)
      onSuccess?.()
      router.refresh()
    },
  })

  const handleNameChange = (value: string) => {
    form.setFieldValue("name", value)
    form.setFieldValue(
      "slug",
      value
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, ""),
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
          <DialogDescription>
            Create a new organization to collaborate with your team.
          </DialogDescription>
        </DialogHeader>
        <form
          id="create-organization-form"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <FieldGroup>
            <form.Field
              name="name"
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Organization Name</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => handleNameChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="Acme Inc."
                      autoComplete="off"
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            />
            <form.Field
              name="slug"
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>URL Slug</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) =>
                        field.handleChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                      }
                      aria-invalid={isInvalid}
                      placeholder="acme-inc"
                      autoComplete="off"
                    />
                    <FieldDescription>
                      This will be used in URLs for your organization.
                    </FieldDescription>
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            />
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <form.Subscribe
            selector={(state) =>
              [state.isSubmitting, state.values.name, state.values.slug] as const
            }
          >
            {([isSubmitting, name, slug]) => (
              <Button
                type="submit"
                form="create-organization-form"
                disabled={isSubmitting || !name || !slug}
              >
                {isSubmitting && <RiLoader4Line className="animate-spin" />}
                Create
              </Button>
            )}
          </form.Subscribe>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function SidebarDashboardHeader() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { isMobile } = useSidebar()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const res = await apiClient.v1.organizations.$get()
      if (!res.ok) return []
      const { data } = await res.json()
      return data
    },
  })

  const { data: activeOrganization, isPending } = useQuery({
    queryKey: ["organization"],
    queryFn: async () => {
      const res = await apiClient.v1.organization.$get()
      if (!res.ok) return null
      const { data } = await res.json()
      return data
    },
  })

  const setActiveMutation = useMutation({
    mutationFn: async (organizationId: string) => {
      const res = await apiClient.v1.organization.$put({
        json: { organizationId },
      })
      if (!res.ok) throw new Error("Failed to set active organization")
      const { data } = await res.json()
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization"] })
      router.refresh()
    },
  })

  const handleInvalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["organization"] })
    queryClient.invalidateQueries({ queryKey: ["organizations"] })
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
                />
              }
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <RiTeamLine className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {isPending ? "" : (activeOrganization?.name ?? "Select Organization")}
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  {isPending
                    ? ""
                    : activeOrganization
                      ? "Organization"
                      : "No organization selected"}
                </span>
              </div>
              <RiExpandUpDownLine className="ml-auto" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className={cn("w-(--anchor-width) min-w-56 rounded-lg", isMobile ? "mt-1" : "ml-3")}
              side={isMobile ? "bottom" : "right"}
              align="start"
              sideOffset={4}
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-muted-foreground text-xs font-medium">
                  Organizations
                </DropdownMenuLabel>
                {organizations.map((org) => (
                  <DropdownMenuItem
                    key={org.id}
                    onClick={() => setActiveMutation.mutate(org.id)}
                    className="cursor-pointer gap-2 p-2"
                  >
                    <div className="flex size-6 items-center justify-center rounded-sm border">
                      <RiTeamLine className="size-4 shrink-0" />
                    </div>
                    <span className="flex-1 truncate">{org.name}</span>
                    {activeOrganization?.id === org.id && (
                      <RiCheckLine className="size-4 shrink-0" />
                    )}
                  </DropdownMenuItem>
                ))}
                {organizations.length === 0 && (
                  <DropdownMenuItem disabled className="text-muted-foreground p-2 text-sm">
                    No organizations yet
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setIsDialogOpen(true)}
                className="cursor-pointer gap-2 p-2"
              >
                <div className="bg-background flex size-6 items-center justify-center rounded-md border">
                  <RiAddLine className="size-4" />
                </div>
                <span className="text-muted-foreground font-medium">Create Organization</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
      <CreateOrganizationDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handleInvalidate}
      />
    </>
  )
}
