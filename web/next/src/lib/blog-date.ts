import { blogTimestampToDate } from "@/lib/blog-policy"

const blogDateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})

export function formatBlogDate(value: string): string {
  const date = blogTimestampToDate(value)
  if (!date) return value

  return blogDateFormatter.format(date)
}

export function toBlogDate(value: string): Date {
  return blogTimestampToDate(value) ?? new Date(`${value.slice(0, 10)}T00:00:00.000Z`)
}
