export function sortByMeta<T extends { url: string }>(
  pages: T[],
  order: string[],
  baseUrl: string,
): T[] {
  const getSlug = (url: string) => url.replace(baseUrl, "").replace(/^\//, "") || "index"

  // Create a position lookup map for O(1) lookups during sorting
  const positionMap = new Map<string, number>()
  order.forEach((slug, index) => positionMap.set(slug, index))

  return [...pages].sort((a, b) => {
    const slugA = getSlug(a.url)
    const slugB = getSlug(b.url)
    const posA = positionMap.get(slugA)
    const posB = positionMap.get(slugB)

    // Pages not in order go to the end
    if (posA === undefined && posB === undefined) return 0
    if (posA === undefined) return 1
    if (posB === undefined) return -1

    return posA - posB
  })
}
