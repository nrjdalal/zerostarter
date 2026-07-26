// Escapes the LIKE/ILIKE metacharacters so a user-supplied search term matches literally. Postgres's LIKE always treats backslash as its escape character unless an ESCAPE clause says otherwise, so escaping with backslash needs no clause. This is not about SQL injection: the term binds as a parameter either way, it only stops % and _ from acting as wildcards.
export const escapeLike = (value: string) => value.replace(/[%_\\]/g, "\\$&")

// True when a write lost a race against a unique constraint. Bun's PostgresError does not put the SQLSTATE in `code`, which holds a driver constant like ERR_POSTGRES_SERVER_ERROR; the SQLSTATE is `errno`. Both are read anyway, and both on the error and on its cause, because drivers disagree and drizzle surfaces the driver error as the cause. Getting this wrong is silent: the insert still fails, it just answers 500 instead of the 409 the route means.
export function isUniqueViolation(error: unknown): boolean {
  const candidates = [error, error instanceof Error ? error.cause : undefined]
  return candidates.some((candidate) => {
    if (typeof candidate !== "object" || candidate === null) return false
    const fields = candidate as { code?: unknown; errno?: unknown }
    return fields.code === "23505" || fields.errno === "23505"
  })
}
