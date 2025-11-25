import { Hono } from "hono"

const app = new Hono()

app.get("/", (c) => {
  return c.text("Hello Hono!")
})

export default {
  port: 4000,
  fetch: app.fetch,
}
