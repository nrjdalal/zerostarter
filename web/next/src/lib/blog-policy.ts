export interface BlogPublication {
  slug: string
  date: string
  draft?: boolean
}

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/

export const todayIsoDate = () => new Date().toISOString().slice(0, 10)

export function normalizeBlogDate(value: unknown): string | null {
  const date = value instanceof Date ? value.toISOString().slice(0, 10) : value
  if (typeof date !== "string" || !isoDatePattern.test(date)) return null

  const parsed = new Date(`${date}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) return null

  return parsed.toISOString().slice(0, 10) === date ? date : null
}

export function isPublishedBlogPublication(
  publication: Pick<BlogPublication, "date" | "draft">,
  today = todayIsoDate(),
): boolean {
  return publication.draft !== true && publication.date <= today
}

export function compareBlogPublications(a: BlogPublication, b: BlogPublication): number {
  return b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug)
}
