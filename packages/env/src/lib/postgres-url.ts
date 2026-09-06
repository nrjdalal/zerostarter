// Point a localhost Postgres URL at the host from inside Docker. Only the host component moves: a substring replace would also hit a "localhost" inside the credentials or the database name and corrupt the connection string.
export const dockerHostUrl = (url: string | undefined): string | undefined => {
  if (!url) return url
  try {
    const parsed = new URL(url)
    if (parsed.hostname !== "localhost") return url
    parsed.hostname = "host.docker.internal"
    return parsed.toString()
  } catch {
    return url
  }
}
