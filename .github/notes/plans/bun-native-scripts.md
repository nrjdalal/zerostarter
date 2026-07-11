# Bun-native file APIs in .github/scripts

- Status: backlog
- Links: #423

The `.github/scripts` run only under Bun but use `node:fs` / `node:path` for I/O; Bun-native equivalents exist (`Bun.file(p).text()`, `Bun.write(p, s)`, `Bun.file(p).delete()`). Convert once it has soaked downstream. See the `runtime-apis` skill for the Bun-first rule.
