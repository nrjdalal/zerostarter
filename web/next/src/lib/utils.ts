import { clsx, type ClassValue } from "clsx"
import { customAlphabet } from "nanoid"
import { twMerge } from "tailwind-merge"
import z from "zod"

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

const generateId = (size: number) => {
  if (!size) return ""
  return customAlphabet(alphabet, size)()
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(value: string, id = 0) {
  const base = z.string().slugify().parse(value.trim())
  const suffix = generateId(id)
  return suffix ? base + "-" + suffix : base
}

// Shared nav active-state matcher. Default is exact-or-trailing-slash; pass { exact: false } for prefix matching.
export function isActive(pathname: string | null, href: string, opts?: { exact?: boolean }) {
  if (!pathname) return false
  const exact = opts && opts.exact === false ? false : true
  if (exact) return pathname === href || pathname === href + "/"
  return pathname.startsWith(href)
}
