import { ACCESS_ROLE } from "@packages/auth/access"

import { assertConsoleAccess } from "@/lib/auth/console"

// Access is admin and above as a property of the group, not of each page in it, so a page added here is gated before anyone remembers to add the line. Every page still asserts for itself: layouts and pages render in parallel, so this cannot be the only check, and getConsoleSession is cached per render pass, so the second assert costs nothing.
export default async function AccessLayout({ children }: { children: React.ReactNode }) {
  await assertConsoleAccess(ACCESS_ROLE)
  return children
}
