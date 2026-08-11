import type { ErrorCode } from "@api/hono"

// The envelope reader, kept apart from the client singleton so a test can import it without pulling config and validating env. Re-exported from @/lib/api/client, which stays the app-facing entry.

// Standard error shape, matching the jsonError envelope in api/hono/src/lib/error.ts; extras like the validation `issues` array are preserved. `code` is the API's ErrorCode union plus the transport codes unwrap itself produces.
export type ApiError = {
  code: ErrorCode | "NETWORK_ERROR" | "UNKNOWN_ERROR"
  message: string
} & Record<string, unknown>

// Success payload from the { data } envelope; a body without `data` yields never and unwrap reports it as an error.
type SuccessData<B> = B extends { data: infer D } ? D : never

export type ApiResult<B> = { data: SuccessData<B>; error: null } | { data: null; error: ApiError }

type RpcResponse = { ok: boolean; json: () => Promise<unknown> }

// Carries the envelope's `code` onto the thrown value, so a caller that needs the reason still has it after unwrapOrThrow.
export class ApiRequestError extends Error {
  readonly code: ApiError["code"]
  readonly error: ApiError

  constructor(error: ApiError) {
    super(error.message)
    this.name = "ApiRequestError"
    this.code = error.code
    this.error = error
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

// Turn a Hono RPC call into a { data, error } result (exactly one is non-null); never throws.
export async function unwrap<R extends RpcResponse>(
  call: Promise<R>,
): Promise<ApiResult<Awaited<ReturnType<R["json"]>>>> {
  try {
    const res = await call
    const body: unknown = await res.json()
    if (res.ok && isRecord(body) && "data" in body) {
      return { data: body.data as SuccessData<Awaited<ReturnType<R["json"]>>>, error: null }
    }
    if (isRecord(body) && isRecord(body.error)) {
      const code = (
        typeof body.error.code === "string" && body.error.code ? body.error.code : "ERROR"
      ) as ApiError["code"]
      const message =
        typeof body.error.message === "string" && body.error.message
          ? body.error.message
          : "Request failed"
      return { data: null, error: { ...body.error, code, message } }
    }
    return { data: null, error: { code: "UNKNOWN_ERROR", message: "Unexpected response" } }
  } catch {
    return { data: null, error: { code: "NETWORK_ERROR", message: "Network request failed" } }
  }
}

// The same read for callers that want a rejected promise, which is what react-query's mutationFn and queryFn expect. Throws ApiRequestError so the code survives, unlike a hand-written `throw new Error(error.message)`.
export async function unwrapOrThrow<R extends RpcResponse>(
  call: Promise<R>,
): Promise<SuccessData<Awaited<ReturnType<R["json"]>>>> {
  const { data, error } = await unwrap(call)
  if (error) throw new ApiRequestError(error)
  return data
}
