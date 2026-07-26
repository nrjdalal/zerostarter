import { z } from "zod"

// What every list route answers alongside its rows. Flat siblings rather than a nested bag, which is what Django REST Framework and Laravel do and what a reader expects; Stripe and GitHub go further and omit the total, because counting is the expensive half on a large table. These tables are staff sized, so the count is cheap and the console shows it.
// Ordered by what a reader asks in sequence, not A to Z: which page is this, how big is a page, how many are there, is there more. See the ordering note in AGENTS.md.
export const pagingSchema = {
  page: z.number().meta({ example: 2 }),
  perPage: z.number().meta({ example: 25 }),
  total: z.number().meta({ example: 42 }),
  hasNextPage: z.boolean().meta({ example: true }),
}

// The end signal, computed where the numbers are known rather than inferred by the caller from how many rows it has accumulated. That inference needs a guard against a stale total, since rows deleted mid-scroll would otherwise keep asking for a page that no longer exists.
export const paging = (input: { page: number; perPage: number; total: number }) => ({
  page: input.page,
  perPage: input.perPage,
  total: input.total,
  hasNextPage: input.page * input.perPage < input.total,
})
