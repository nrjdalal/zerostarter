"use client"

import { features } from "@packages/config/site"
import { RiAddLine, RiBookLine, RiBuildingLine } from "@remixicon/react"
import { useForm } from "@tanstack/react-form"
import { type User } from "better-auth/types"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { z } from "zod"

import { SidebarDropdownMenu } from "@/components/shell/sidebar-dropdown-menu"
import { SidebarUserMenu } from "@/components/shell/sidebar-user-menu"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Spinner } from "@/components/ui/spinner"
import { authClient } from "@/lib/auth/client"
import { config } from "@/lib/config"
import { slugify } from "@/lib/utils"

type Organization = {
  id: string
  name: string
  slug: string
  logo?: string | null
}

const LAST_ORG_COOKIE = "last-active-org"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 400

function setLastOrgId(userId: string, orgId: string) {
  document.cookie = `${LAST_ORG_COOKIE}_${userId}=${encodeURIComponent(orgId)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
}

const formSchema = z.object({
  name: z.string().min(2).max(32),
})

export function OrgSwitcher() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [isOrgTransitioning, setIsOrgTransitioning] = useState(false)

  const { data: session } = authClient.useSession()
  const { data: orgs, refetch: refetchOrgs } = authClient.useListOrganizations()
  const {
    data: activeOrg,
    isPending: isPendingActiveOrg,
    refetch: refetchActiveOrg,
  } = authClient.useActiveOrganization()

  const form = useForm({
    defaultValues: {
      name: "",
    },
    validators: {
      onSubmit: formSchema,
      onChange: formSchema,
    },
    onSubmit: async ({ value }) => {
      setIsOrgTransitioning(true)
      try {
        const name = value.name.trim()
        const slug = slugify(name, 4)
        const result = await authClient.organization.create({
          name,
          slug,
        })

        if (result.error) {
          toast.error(result.error.message || "Failed to create organization")
          return
        }

        if (result.data) {
          await authClient.organization.setActive({ organizationId: result.data.id })
          if (session?.user.id) setLastOrgId(session.user.id, result.data.id)
          refetchOrgs()
          refetchActiveOrg()
          setCreateDialogOpen(false)
          form.reset()
          toast.success("Organization created!")
        }
      } finally {
        setIsOrgTransitioning(false)
      }
    },
  })

  const handleSetActive = async (organizationId: string) => {
    try {
      setIsOrgTransitioning(true)
      await authClient.organization.setActive({ organizationId })
      if (session?.user.id) setLastOrgId(session.user.id, organizationId)
      await Promise.all([refetchOrgs(), refetchActiveOrg()])
    } catch (error) {
      console.error("Failed to set active organization", error)
      toast.error("Failed to switch organization")
    } finally {
      setIsOrgTransitioning(false)
    }
  }

  const organizations: Organization[] = orgs ?? []
  const isOrgLoading = isPendingActiveOrg || isOrgTransitioning

  return (
    <>
      <SidebarDropdownMenu
        align="start"
        mobileSide="bottom"
        trigger={{
          leading: (
            <div className="bg-sidebar-accent text-sidebar-accent-foreground flex aspect-square size-8 items-center justify-center rounded-md">
              <RiBuildingLine className="size-4" />
            </div>
          ),
          primary: isOrgLoading ? "" : (activeOrg?.name ?? "Select Organization"),
          secondary: isOrgLoading ? "" : (activeOrg?.slug ?? "No organization selected"),
          secondaryClassName: "text-muted-foreground",
        }}
        header={{
          leading: (
            <div className="bg-sidebar-accent text-sidebar-accent-foreground flex size-8 items-center justify-center rounded-md">
              <RiBuildingLine className="size-4" />
            </div>
          ),
          primary: activeOrg?.name ?? "No organization",
          secondary: activeOrg?.slug ?? "Create one to get started",
          secondaryClassName: "text-muted-foreground",
        }}
      >
        {organizations
          .filter((org) => org.id !== activeOrg?.id)
          .map((org) => (
            <DropdownMenuItem
              key={org.id}
              disabled={isOrgTransitioning}
              onClick={() => handleSetActive(org.id)}
            >
              <RiBuildingLine />
              {org.name}
            </DropdownMenuItem>
          ))}
        <DropdownMenuItem disabled={isOrgTransitioning} onClick={() => setCreateDialogOpen(true)}>
          <RiAddLine />
          Create organization
        </DropdownMenuItem>
      </SidebarDropdownMenu>

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
            </FieldGroup>
            <Button
              type="submit"
              variant="secondary"
              className="w-full"
              disabled={form.state.isSubmitting}
            >
              {form.state.isSubmitting ? <Spinner /> : null}
              Create organization
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function DashboardFooter({
  user,
  canAccessConsole,
}: {
  user: User
  canAccessConsole: boolean
}) {
  const { isMobile, setOpenMobile } = useSidebar()
  const close = () => {
    if (isMobile) setOpenMobile(false)
  }
  return (
    <SidebarMenu className="space-y-1.5">
      {features.docs && (
        <SidebarMenuItem>
          <SidebarMenuButton render={<Link href="/docs" onClick={close} />}>
            <RiBookLine />
            <span>Documentation</span>
            <span className="text-muted-foreground ml-auto text-xs">v{config.app.version}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}
      <SidebarUserMenu user={user} area={canAccessConsole ? "dashboard" : undefined} />
    </SidebarMenu>
  )
}
