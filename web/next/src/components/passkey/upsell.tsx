"use client"

import { RiCloseLine, RiKey2Line } from "@remixicon/react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { authClient } from "@/lib/auth/client"

// localStorage flag for the user's "don't show again" preference ONLY; whether the user has a passkey is decided by the server query below, never by storage.
const DISMISS_KEY = "passkey-upsell-dismissed"

export function PasskeyUpsell() {
  // Permanent dismissal: read after mount so SSR and the client paint the same thing.
  const [dismissed, setDismissed] = useState(true)
  // Session-scoped "Not now": resets on reload, never persisted.
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1")
  }, [])

  const { data: passkeyCount } = useQuery({
    queryKey: ["passkeys", "count"],
    queryFn: async () => {
      const res = await authClient.passkey.listUserPasskeys()
      if (res.error) throw new Error(res.error.message || "Failed to load passkeys")
      return res.data.length
    },
  })

  if (dismissed || hidden || passkeyCount !== 0) return null

  return (
    <Card size="sm" className="max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RiKey2Line className="size-4" />
          Sign in faster next time
        </CardTitle>
        <CardDescription>
          Add a passkey to sign in with Touch ID, Face ID, or a security key, no password needed.
        </CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer"
            aria-label="Dismiss"
            onClick={() => setHidden(true)}
          >
            <RiCloseLine className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Button
          size="sm"
          className="cursor-pointer"
          render={<Link href="/dashboard/settings/passkeys" />}
        >
          <RiKey2Line className="size-4" />
          Add a passkey
        </Button>
      </CardContent>
      <CardFooter className="gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="cursor-pointer"
          onClick={() => setHidden(true)}
        >
          Not now
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground cursor-pointer"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, "1")
            setDismissed(true)
          }}
        >
          Don&apos;t show again
        </Button>
      </CardFooter>
    </Card>
  )
}
