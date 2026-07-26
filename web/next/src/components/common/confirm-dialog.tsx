"use client"

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

// One confirm for every "are you sure" in the app, because the scaffold is the part that drifts: the pending state opens it, preventDefault keeps it open while the work runs, and every control disables so a second click cannot fire the same mutation twice.
export function ConfirmDialog({
  action,
  description,
  onConfirm,
  onOpenChange,
  open,
  pending = false,
  title,
  variant,
}: {
  action: string
  description: React.ReactNode
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
  open: boolean
  pending?: boolean
  title: React.ReactNode
  variant?: "default" | "destructive"
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={variant}
            disabled={pending}
            onClick={(event) => {
              // The dialog would close on click and take the pending state with it, so the mutation would lose what it was acting on.
              event.preventDefault()
              onConfirm()
            }}
          >
            {action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
