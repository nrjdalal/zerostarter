import { describe, expect, test } from "bun:test"

import { Client, enabled, WEB } from "../../../../../../stack"

// The resume page in web/next/src/app/(marketing)/resume/page.tsx on a running stack: it renders, with a Download PDF button whose file is served.

describe.skipIf(!enabled)("web/next/src/app/(marketing)/resume/page.tsx", () => {
  test("the resume page renders", async () => {
    const response = await new Client(WEB).fetch("/resume")
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("text/html")
  })

  test("the page offers the PDF for download", async () => {
    const html = await (await new Client(WEB).fetch("/resume")).text()
    expect(html).toContain("Download PDF")
    expect(html).toContain('href="/neeraj-dalal-resume.pdf"')
    const pdf = await new Client(WEB).fetch("/neeraj-dalal-resume.pdf")
    expect(pdf.status).toBe(200)
    expect(pdf.headers.get("content-type")).toContain("application/pdf")
  })
})
