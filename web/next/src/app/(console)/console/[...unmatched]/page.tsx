import { notFound } from "next/navigation"

// Catch-all so an unknown console path still renders inside the console layout and lands in its not-found boundary. Without it Next has no route to match, falls through to the global 404, and answers differently from a path that exists but sits above the viewer's rung, which is enough to enumerate which console pages are real. Specific segments win over a catch-all, so no existing route is affected.
export default function Page() {
  notFound()
}
