import { toast as manager } from "@/components/ui/toast"

// The three toasts this app raises, over Base UI's toast manager, which takes a type rather than offering a method per kind.
// An adapter rather than calling add() at each site: twenty-one call sites already read as toast.error("..."), that reads better than an options object at every one of them, and keeping the shape means the kinds an app raises are a list in one file rather than a string typed twenty-one times.
export const toast = {
  error: (title: string) => manager.add({ title, type: "error" }),
  success: (title: string) => manager.add({ title, type: "success" }),
  warning: (title: string) => manager.add({ title, type: "warning" }),
}
