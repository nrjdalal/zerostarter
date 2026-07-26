import { toast } from "@/components/ui/toast"

// Copying is one operation with one failure mode, so it says so in one place. writeText rejects on a denied permission or a non-secure origin, which is worth telling someone about rather than looking like nothing happened.
export async function copyToClipboard(value: string, message: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.add({ title: message, type: "success" })
  } catch {
    toast.add({ title: "Copy failed", type: "error" })
  }
}
