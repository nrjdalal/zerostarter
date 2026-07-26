import { z } from "zod"

// The fields every list answers alongside its collection. API Conventions carries the argument for the shape.
export const pagingFields = {
  hasNextPage: z.boolean().meta({ example: true }),
  page: z.number().meta({ example: 2 }),
  perPage: z.number().meta({ example: 25 }),
  total: z.number().meta({ example: 42 }),
}

// The end signal, computed where the numbers are known rather than left to a caller counting what it has loaded against a total that can move underneath it.
export const paging = (input: { page: number; perPage: number; total: number }) => ({
  hasNextPage: input.page * input.perPage < input.total,
  page: input.page,
  perPage: input.perPage,
  total: input.total,
})
