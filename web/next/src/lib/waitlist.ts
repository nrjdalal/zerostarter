// One address per line, in the order they signed up, because what a copy is for here is pasting into whatever sends the mail. Not JSON: nothing downstream of a mail composer wants field names.
// Its own module rather than the table component, so a test can reach it without pulling the client graph, and with it the env the API client validates.
export function waitlistEmails(signups: { createdAt: string; email: string }[]) {
  return [...signups]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((signup) => signup.email)
    .join("\n")
}
