// Semantic column-width archetypes, the single source for columnDef.size across every table: pick by what the column holds, not by eyeballing a number, so the same kind of data is the same width everywhere. Measured at the default cell padding and type scale, snapped to an 8px grid; tune an archetype here, or add a new one, instead of writing ad-hoc sizes in a columns file.
export const COLUMN_SIZES = {
  // the icon-sm row-actions button
  actions: 56,
  // role/status badges
  badge: 112,
  // "25 Jun 2026" plus the sort chevron
  date: 152,
  // date plus time
  datetime: 200,
  // a typical address; the usual meta.flex floor
  email: 320,
  // a single icon or indicator
  icon: 48,
  // short codes; long ids truncate
  id: 96,
  // an Item identity cell: avatar plus stacked name and email
  identity: 280,
  // a plain text name
  name: 200,
  // a 24px avatar, gap, and name
  nameWithAvatar: 240,
  // counts and amounts
  number: 112,
  // the row checkbox
  select: 48,
} as const
