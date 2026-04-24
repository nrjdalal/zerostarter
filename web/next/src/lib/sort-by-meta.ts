type PageNode = { type: "page"; url: string }
type FolderNode = { type: "folder"; index?: PageNode; children: TreeNode[] }
type SeparatorNode = { type: "separator" }
type RootNode = { type: "root"; children: TreeNode[] }
type TreeNode = PageNode | FolderNode | SeparatorNode | RootNode

function collectUrls(node: TreeNode, out: string[]): void {
  if (node.type === "page") {
    out.push(node.url)
    return
  }
  if (node.type === "folder") {
    if (node.index) out.push(node.index.url)
    for (const child of node.children) collectUrls(child, out)
    return
  }
  if (node.type === "root") {
    for (const child of node.children) collectUrls(child, out)
  }
}

export function sortByPageTree<T extends { url: string }>(
  pages: T[],
  tree: { children: TreeNode[] },
): T[] {
  const orderedUrls: string[] = []
  collectUrls({ type: "root", children: tree.children }, orderedUrls)

  const positionMap = new Map<string, number>()
  orderedUrls.forEach((url, index) => positionMap.set(url, index))

  return [...pages].sort((a, b) => {
    const posA = positionMap.get(a.url)
    const posB = positionMap.get(b.url)
    if (posA === undefined && posB === undefined) return 0
    if (posA === undefined) return 1
    if (posB === undefined) return -1
    return posA - posB
  })
}
