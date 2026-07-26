import { describe, expect, test } from "bun:test"

import {
  applyColumnManager,
  autoWidthUnits,
  growingColumnIds,
  measureLabelPx,
  resolveSort,
  type ColumnConfig,
} from "../../../../../web/next/src/lib/data-table-layout"

describe("measureLabelPx", () => {
  test("sums the per-character advances of the generated metrics", () => {
    // The generator asserts these against real font shaping, so a drift here means the consumer drifted, not the data.
    expect(measureLabelPx("Name")).toBeCloseTo(38.44, 1)
    expect(measureLabelPx("Joined")).toBeCloseTo(44.31, 1)
  })

  test("applies kerning, so a pair is not the sum of its parts", () => {
    const pair = measureLabelPx("Ta")
    expect(pair).not.toBeCloseTo(measureLabelPx("T") + measureLabelPx("a"), 2)
  })

  test("falls back to the average advance for a character the font does not map", () => {
    expect(measureLabelPx("\u{10FFFF}")).toBeGreaterThan(0)
  })

  test("an empty label measures zero", () => {
    expect(measureLabelPx("")).toBe(0)
  })
})

describe("autoWidthUnits", () => {
  test("snaps up to the 3-unit grid", () => {
    for (const extra of [0, 7, 10, 36]) {
      expect(autoWidthUnits("Name", extra) % 3).toBe(0)
    }
  })

  test("reproduces the widths the console users table renders", () => {
    expect(autoWidthUnits("Name", 36)).toBe(48)
    expect(autoWidthUnits("Email", 48)).toBe(57)
    expect(autoWidthUnits("Role", 10)).toBe(18)
    expect(autoWidthUnits("Status", 10)).toBe(21)
    expect(autoWidthUnits("Joined", 18)).toBe(30)
  })

  test("a wider label never yields a narrower column", () => {
    expect(autoWidthUnits("Organization name", 10)).toBeGreaterThan(autoWidthUnits("Name", 10))
  })
})

const columns = (ids: string[]) => ids.map((id) => ({ id, header: id }))

describe("applyColumnManager", () => {
  const config: Record<string, ColumnConfig> = {
    email: { extra: 48, flex: true },
    name: { extra: 36 },
    role: { align: "center" },
    select: { width: 12 },
  }
  const applied = applyColumnManager(columns(["select", "name", "email", "role"]), config)
  const byId = (id: string) => applied.find((column) => column.id === id)

  test("an explicit width is exact and marked fixed", () => {
    expect(byId("select")).toMatchObject({ size: 12, meta: { auto: false } })
  })

  test("a widthless column sizes from its label and is marked auto", () => {
    expect(byId("name")).toMatchObject({ size: autoWidthUnits("name", 36), meta: { auto: true } })
  })

  test("flex capability reaches back to every column before the flex one", () => {
    expect(byId("select")!.meta!.flex).toBe(true)
    expect(byId("name")!.meta!.flex).toBe(true)
    expect(byId("email")!.meta!.flex).toBe(true)
    expect(byId("role")!.meta!.flex).toBe(false)
  })

  test("align defaults to left and wrap to false", () => {
    expect(byId("name")!.meta).toMatchObject({ align: "left", wrap: false })
    expect(byId("role")!.meta!.align).toBe("center")
  })

  test("a column with no config entry takes the defaults, never tanstack's pixel-minded size", () => {
    const [actions] = applyColumnManager(columns(["actions"]), {})
    expect(actions.size).toBe(autoWidthUnits("actions", 10))
    expect(actions.size).not.toBe(150)
  })

  test("meta.label is preferred over the id when measuring", () => {
    const [column] = applyColumnManager(
      [{ id: "createdAt", header: "Joined", meta: { label: "Joined" } }],
      { createdAt: { extra: 18 } },
    )
    expect(column.size).toBe(autoWidthUnits("Joined", 18))
  })
})

describe("growingColumnIds", () => {
  const cols = (spec: [string, { auto?: boolean; flex?: boolean }][]) =>
    spec.map(([id, meta]) => ({ ...meta, id }))

  test("only the last flex-capable column grows", () => {
    const growing = growingColumnIds(
      cols([
        ["select", { flex: true }],
        ["name", { flex: true }],
        ["email", { flex: true }],
        ["role", {}],
      ]),
    )
    expect([...growing]).toEqual(["email"])
  })

  test("hiding the growing column hands growth backward", () => {
    const growing = growingColumnIds(
      cols([
        ["select", { flex: true }],
        ["name", { flex: true }],
        ["role", {}],
      ]),
    )
    expect([...growing]).toEqual(["name"])
  })

  test("a table with no flex column spreads its widthless columns instead", () => {
    const growing = growingColumnIds(
      cols([
        ["select", { auto: false }],
        ["name", { auto: true }],
        ["email", { auto: true }],
      ]),
    )
    expect([...growing]).toEqual(["name", "email"])
  })

  test("nothing grows when no column is flex-capable or auto", () => {
    expect(
      growingColumnIds(
        cols([
          ["select", {}],
          ["actions", {}],
        ]),
      ).size,
    ).toBe(0)
  })
})

describe("resolveSort", () => {
  const FIELDS = { createdAt: "createdAt", rule: "value", status: "banned" } as const

  test("maps a column id onto the endpoint's field", () => {
    expect(resolveSort(FIELDS, "rule", "createdAt")).toBe("value")
    expect(resolveSort(FIELDS, "status", "createdAt")).toBe("banned")
  })

  test("falls back for an id the endpoint does not accept", () => {
    expect(resolveSort(FIELDS, "nonsense", "createdAt")).toBe("createdAt")
    expect(resolveSort(FIELDS, "", "createdAt")).toBe("createdAt")
  })

  test("does not resolve a crafted id through the prototype chain", () => {
    // `"constructor" in FIELDS` is true, so `in` would send Object itself as the sort and park the table on the API's 400.
    for (const crafted of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
      expect(resolveSort(FIELDS, crafted, "createdAt")).toBe("createdAt")
    }
  })
})
