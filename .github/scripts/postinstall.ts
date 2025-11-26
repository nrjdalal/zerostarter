import fs from "node:fs"
import path from "node:path"
import { globby } from "globby"

const rootPackageJsonPath = path.join(process.cwd(), "package.json")

async function main() {
  try {
    const content = fs.readFileSync(rootPackageJsonPath, "utf8")
    const pkg = JSON.parse(content)

    if (!pkg.catalog) {
      pkg.catalog = {}
    }

    let rootPkgModified = false
    let catalog = { ...pkg.catalog }

    const packageJsonFiles = await globby("**/package.json", {
      gitignore: true,
      ignore: ["**/node_modules/**"],
      absolute: true,
    })

    const usedDependencies = new Set<string>()

    for (const pPath of packageJsonFiles) {
      const isRoot = pPath === rootPackageJsonPath
      const pPkg = isRoot ? pkg : JSON.parse(fs.readFileSync(pPath, "utf8"))
      let pPkgModified = false

      const depTypes = [
        "dependencies",
        "devDependencies",
        "peerDependencies",
        "optionalDependencies",
      ]

      for (const type of depTypes) {
        if (pPkg[type]) {
          for (const [dep, version] of Object.entries(pPkg[type] as Record<string, string>)) {
            usedDependencies.add(dep)

            const isCatalog = version === "catalog:"
            const isWorkspace = version.startsWith("workspace:")
            const isFile = version.startsWith("file:")
            const isLink = version.startsWith("link:")
            const isHttp = version.startsWith("http:") || version.startsWith("https:")
            const isGit = version.startsWith("git:") || version.startsWith("git+")

            if (
              !isCatalog &&
              !isWorkspace &&
              !isFile &&
              !isLink &&
              !isHttp &&
              !isGit &&
              pkg.catalog
            ) {
              if (catalog[dep] !== version) {
                catalog[dep] = version
                rootPkgModified = true
              }
              pPkg[type][dep] = "catalog:"
              pPkgModified = true
            }
          }
        }
      }

      if (pPkgModified) {
        if (isRoot) {
          rootPkgModified = true
        } else {
          fs.writeFileSync(pPath, JSON.stringify(pPkg, null, 2) + "\n")
          console.log(`Updated dependencies to catalog: in ${path.relative(process.cwd(), pPath)}`)
        }
      }
    }

    if (rootPkgModified) {
      pkg.catalog = catalog
    }

    const sortedCatalog = Object.keys(pkg.catalog)
      .sort()
      .reduce(
        (acc, key) => {
          acc[key] = pkg.catalog[key]
          return acc
        },
        {} as Record<string, string>,
      )

    if (JSON.stringify(pkg.catalog) !== JSON.stringify(sortedCatalog)) {
      pkg.catalog = sortedCatalog
      rootPkgModified = true
    }

    if (rootPkgModified) {
      const newContent = JSON.stringify(pkg, null, 2) + "\n"
      fs.writeFileSync(rootPackageJsonPath, newContent)
      console.log("Updated catalog in package.json")
    }

    const unusedPackages = Object.keys(pkg.catalog).filter((key) => !usedDependencies.has(key))

    if (unusedPackages.length > 0) {
      console.warn("[INFO] The following packages in 'catalog' are unused at root package.json:")
      unusedPackages.forEach((pkgName) => console.warn(`       - ${pkgName}`))
      console.warn()
    }
  } catch (error) {
    console.error("Error processing package.json:", error)
    process.exit(1)
  }
}

main()
