// The Scalar code sample for a route, cast because describeRoute's options type has no slot for an OpenAPI extension. One place so a route adds a sample by writing the snippet, not by restating the envelope around it.
export const codeSample = (source: string) =>
  ({
    "x-codeSamples": [{ lang: "typescript", label: "hono/client", source }],
  }) as object
