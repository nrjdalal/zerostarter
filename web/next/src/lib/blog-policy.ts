export interface BlogPublication {
  slug: string
  date: string
  lastEdited?: string
  publishAt?: string
  draft?: boolean
}

const isoDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/
const isoDateTimePattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-](\d{2}):(\d{2}))$/

function isValidDateParts(year: number, month: number, day: number): boolean {
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  )
}

export function normalizeBlogDate(value: unknown): string | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    const iso = value.toISOString()
    return iso.endsWith("T00:00:00.000Z") ? iso.slice(0, 10) : null
  }

  if (typeof value !== "string") return null

  const dateMatch = value.match(isoDatePattern)
  if (dateMatch) {
    const year = Number(dateMatch[1])
    const month = Number(dateMatch[2])
    const day = Number(dateMatch[3])
    return isValidDateParts(year, month, day) ? value : null
  }

  return null
}

export function normalizeBlogPublishAt(value: unknown): string | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    const iso = value.toISOString()
    return iso.endsWith("T00:00:00.000Z") ? iso.slice(0, 10) : iso
  }

  if (typeof value !== "string") return null

  const date = normalizeBlogDate(value)
  if (date) return date

  const dateTimeMatch = value.match(isoDateTimePattern)
  if (!dateTimeMatch) return null

  const year = Number(dateTimeMatch[1])
  const month = Number(dateTimeMatch[2])
  const day = Number(dateTimeMatch[3])
  const hour = Number(dateTimeMatch[4])
  const minute = Number(dateTimeMatch[5])
  const second = Number(dateTimeMatch[6] ?? "0")
  const zone = dateTimeMatch[7]
  const offsetHour = Number(dateTimeMatch[8] ?? "0")
  const offsetMinute = Number(dateTimeMatch[9] ?? "0")
  if (
    !zone ||
    !isValidDateParts(year, month, day) ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    (zone !== "Z" && (offsetHour > 23 || offsetMinute > 59))
  ) {
    return null
  }

  return Number.isNaN(Date.parse(value)) ? null : value
}

function blogPublishTime(publishAt: string): number | null {
  const normalized = normalizeBlogPublishAt(publishAt)
  if (!normalized) return null
  return Date.parse(normalized.includes("T") ? normalized : `${normalized}T00:00:00.000Z`)
}

export function isPublishedBlogPublication(
  publication: Pick<BlogPublication, "draft" | "publishAt">,
  now = new Date(),
): boolean {
  if (publication.draft === true) return false
  if (!publication.publishAt) return true

  const publishTime = blogPublishTime(publication.publishAt)
  return publishTime !== null && publishTime <= now.getTime()
}

function blogDateTime(date: string): number | null {
  const normalized = normalizeBlogDate(date)
  return normalized ? Date.parse(`${normalized}T00:00:00.000Z`) : null
}

export function compareBlogPublications(a: BlogPublication, b: BlogPublication): number {
  const aTime = blogDateTime(a.date)
  const bTime = blogDateTime(b.date)
  if (aTime === null && bTime === null) return a.slug.localeCompare(b.slug)
  if (aTime === null) return 1
  if (bTime === null) return -1
  return bTime - aTime || a.slug.localeCompare(b.slug)
}
