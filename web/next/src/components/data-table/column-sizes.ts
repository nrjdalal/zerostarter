// Column widths, the single source for columnDef.size across every table. "global" holds the semantic archetypes, measured at the default cell padding and type scale and snapped to a 12px grid; each table block maps its column ids onto them (or a deliberate one-off number), so a columns file reads COLUMN_SIZES.<area>.<table>.<columnId> and tuning stays here, never ad-hoc in a columns file.
const global = {
  // the icon-sm row-actions button
  actions: 60,
  // the admin plugin's Active/Banned status text
  banned: 108,
  // "25 Jun 2026" plus the sort chevron
  date: 144,
  // date plus time
  datetime: 192,
  // a typical address; the usual meta.flex floor
  email: 324,
  // a single icon or indicator
  icon: 48,
  // short codes; long ids truncate
  id: 96,
  // an Item identity cell: avatar plus stacked name and email
  identity: 276,
  // a plain text name
  name: 192,
  // a 24px avatar, gap, and name
  nameWithAvatar: 240,
  // counts and amounts
  number: 108,
  // a short role token like Admin or User
  role: 108,
  // the row checkbox
  select: 48,
} as const

export const COLUMN_SIZES = {
  global,
  console: {
    users: {
      actions: global.actions,
      banned: global.banned,
      createdAt: global.date,
      email: global.email,
      name: global.name,
      role: global.role,
      select: global.select,
    },
  },
} as const
