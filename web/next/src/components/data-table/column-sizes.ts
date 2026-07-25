// Column widths in Tailwind spacing units (1 = 0.25rem, so 12 = 48px at the default scale), rendered as calc(var(--spacing) * n) so tables scale with the theme and user font-size. "global" holds the semantic archetypes, measured at the default cell padding and type scale and snapped to multiples of 3; each table block maps its column ids onto them (or a deliberate one-off number), so a columns file reads COLUMN_SIZES.<area>.<table>.<columnId> and tuning stays here, never ad-hoc in a columns file. Names follow what the column says (a column headed Status is status), never the backing field (banned).
const global = {
  // the icon-sm row-actions button
  actions: 12,
  // a compact date; content truncates
  date: 12,
  // a typical address; the usual meta.flex floor
  email: 81,
  // a plain text name
  name: 48,
  // a short role token like Admin or User
  role: 12,
  // the row checkbox
  select: 12,
  // a short state word like Active or Banned
  status: 12,
} as const

export const COLUMN_SIZES = {
  global,
  console: {
    users: {
      actions: global.actions,
      createdAt: global.date,
      email: global.email,
      name: global.name,
      role: global.role,
      select: global.select,
      status: global.status,
    },
  },
} as const
