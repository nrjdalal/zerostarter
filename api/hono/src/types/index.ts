import { auth } from "@packages/auth"

// ~ Auth Types
export type User = typeof auth.$Infer.Session.user
export type Session = typeof auth.$Infer.Session.session

export type AppSession = {
  session: Session
  user: User
} | null

// ~ Hono Types
export type Variables = {
  session: Session
  user: User
}
