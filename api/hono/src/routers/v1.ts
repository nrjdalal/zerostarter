import { Hono } from "hono"

import { authMiddleware } from "@/middlewares/auth"

export const v1Router = new Hono()
  .get("/public", (c) => {
    return c.json({
      message: "Hello from public endpoint!",
    })
  })
  .use("/private/*", authMiddleware)
  .get("/private/user", (c) => {
    const user = c.get("user")
    return c.json({
      message: "Hello from private endpoint!",
      user,
    })
  })
