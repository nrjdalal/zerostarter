import { describe, expect, test } from "bun:test"

import { dockerHostUrl } from "../../../../../packages/env/src/lib/postgres-url"

describe("dockerHostUrl", () => {
  test("moves a localhost host to the Docker host alias", () => {
    expect(dockerHostUrl("postgres://user:pw@localhost:5432/db")).toBe(
      "postgres://user:pw@host.docker.internal:5432/db",
    )
  })

  test("moves the host only, so a localhost inside the credentials or the database name stays put", () => {
    // The first-match substring replace this replaced would have rewritten the password and left the host alone.
    expect(dockerHostUrl("postgres://user:mylocalhostpw@localhost:5432/localhost")).toBe(
      "postgres://user:mylocalhostpw@host.docker.internal:5432/localhost",
    )
  })

  test("keeps the query string and the port", () => {
    expect(dockerHostUrl("postgres://localhost:6543/db?sslmode=disable")).toBe(
      "postgres://host.docker.internal:6543/db?sslmode=disable",
    )
  })

  test("leaves any other host alone", () => {
    const remote = "postgres://user:pw@db.example.com:5432/db"
    expect(dockerHostUrl(remote)).toBe(remote)
    expect(dockerHostUrl("postgres://127.0.0.1:5432/db")).toBe("postgres://127.0.0.1:5432/db")
  })

  test("passes an absent or unparseable value through for the schema to reject", () => {
    expect(dockerHostUrl(undefined)).toBeUndefined()
    expect(dockerHostUrl("")).toBe("")
    expect(dockerHostUrl("not a url")).toBe("not a url")
  })
})
