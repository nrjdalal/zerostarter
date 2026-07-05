import type { AppType, ErrorCode } from "@api/hono"
import { hc } from "hono/client"

import { config } from "@/lib/config"

type Client = ReturnType<typeof hc<AppType>>

const hcWithType = (...args: Parameters<typeof hc>): Client => hc<AppType>(...args)

const url = config.api.internalUrl ? config.api.internalUrl : config.api.url

const honoClient = hcWithType(url, {
  init: {
    credentials: "include",
  },
})

export const apiClient = honoClient.api

// Standard error shape, matching the jsonError envelope in api/hono/src/lib/error.ts; extras like the validation `issues` array are preserved. `code` is the API's ErrorCode union plus the transport codes unwrap itself produces.
export type ApiError = {
  code: ErrorCode | "NETWORK_ERROR" | "UNKNOWN_ERROR"
  message: string
} & Record<string, unknown>

// Success payload from the { data } envelope; a body without `data` yields never and unwrap reports it as an error.
type SuccessData<B> = B extends { data: infer D } ? D : never

export type ApiResult<B> = { data: SuccessData<B>; error: null } | { data: null; error: ApiError }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

type RpcResponse = { ok: boolean; json: () => Promise<unknown> }

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
