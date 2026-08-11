import { z } from "zod"

// What every list endpoint here takes, so a cap stated once cannot drift between two routes. Each route adds its own sort enum and facets.
export const listQueryShape = {
  dir: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(10),
  q: z.string().trim().max(254).optional(),
}

// A comma-separated facet, deduped and held to the values the endpoint accepts, so a hand-written query degrades to unfiltered rather than 400ing the table.
export const facetSchema = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .string()
    .optional()
    .transform((value) => (value ? [...new Set(value.split(","))] : []))
    .pipe(z.array(z.enum(values)).max(values.length))

// The Scalar code sample for a route, cast because describeRoute's options type has no slot for an OpenAPI extension. One place so a route adds a sample by writing the snippet, not by restating the envelope around it.
export const codeSample = (source: string) =>
  ({
    "x-codeSamples": [{ lang: "typescript", label: "hono/client", source }],
  }) as object
