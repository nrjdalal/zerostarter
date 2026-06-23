import { expect, test } from "bun:test"

import { markerKey, settingsUrl } from "../../../.github/scripts/ensure-remote-main"

test("settingsUrl builds the Actions settings URL from an SSH remote", () => {
  expect(settingsUrl("git@github.com:acme/widgets.git")).toBe(
    "https://github.com/acme/widgets/settings/actions",
  )
})

test("settingsUrl builds the Actions settings URL from an HTTPS remote", () => {
  expect(settingsUrl("https://github.com/acme/widgets.git")).toBe(
    "https://github.com/acme/widgets/settings/actions",
  )
})

test("settingsUrl handles an HTTPS remote without .git and a trailing slash", () => {
  expect(settingsUrl("https://github.com/acme/widgets/")).toBe(
    "https://github.com/acme/widgets/settings/actions",
  )
})

test("settingsUrl returns empty for a non-GitHub remote", () => {
  expect(settingsUrl("https://gitlab.com/acme/widgets.git")).toBe("")
})

test("markerKey is scoped per remote so seeding one does not mark another", () => {
  expect(markerKey("origin")).toBe("zerostarter.mainSeeded.origin")
  expect(markerKey("upstream")).toBe("zerostarter.mainSeeded.upstream")
})

test("markerKey sanitizes a remote name into a valid git-config key", () => {
  expect(markerKey("feature/fork")).toBe("zerostarter.mainSeeded.feature-fork")
})
