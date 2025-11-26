import fs from "node:fs"
import path from "node:path"

const rootPackageJsonPath = path.join(process.cwd(), "package.json")

const args = process.argv.slice(2)
const isRootPackageJsonStaged = args.some((arg) => path.resolve(arg) === rootPackageJsonPath)

if (args.length === 0 || isRootPackageJsonStaged) {
  try {
    const content = fs.readFileSync(rootPackageJsonPath, "utf8")
    const pkg = JSON.parse(content)

    if (pkg.catalog) {
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
        const newContent = JSON.stringify(pkg, null, 2) + "\n"
        fs.writeFileSync(rootPackageJsonPath, newContent)
        console.log("Sorted catalog in package.json")
      }
    }
  } catch (error) {
    console.error("Error processing package.json:", error)
    process.exit(1)
  }
}
