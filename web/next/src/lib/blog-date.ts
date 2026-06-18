import { blogTimestampToDate, normalizeBlogTimestamp } from "@/lib/blog-policy"

const blogDateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})

export function formatBlogDate(value: string): string {
  const normalized = normalizeBlogTimestamp(value)
  if (!normalized) return value

  return blogDateFormatter.format(new Date(`${normalized.slice(0, 10)}T00:00:00.000Z`))
}

export function toBlogDate(value: string): Date {
  return blogTimestampToDate(value) ?? new Date(`${value.slice(0, 10)}T00:00:00.000Z`)
}
