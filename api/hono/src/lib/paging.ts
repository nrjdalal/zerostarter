import { z } from "zod"

// What every list route answers alongside its rows. Flat siblings rather than a nested bag, which is what Django REST Framework and Laravel do and what a reader expects; Stripe and GitHub go further and omit the total, because counting is the expensive half on a large table. These tables are staff sized, so the count is cheap and the console shows it.
export const pagingSchema = {
  hasNextPage: z.boolean().meta({ example: true }),
  page: z.number().meta({ example: 2 }),
  perPage: z.number().meta({ example: 25 }),
  total: z.number().meta({ example: 42 }),
}

// The end signal, computed where the numbers are known rather than inferred by the caller from how many rows it has accumulated. That inference needs a guard against a stale total, since rows deleted mid-scroll would otherwise keep asking for a page that no longer exists.
export const paging = (input: { page: number; perPage: number; total: number }) => ({
  hasNextPage: input.page * input.perPage < input.total,
  page: input.page,
  perPage: input.perPage,
  total: input.total,
})
