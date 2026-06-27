// Client-safe AAGUID -> authenticator name map for labeling passkeys in the UI.
// Inlined (not imported from @better-auth/passkey) so @simplewebauthn/server stays out of the client bundle.
// Keys and names are copied verbatim from https://github.com/passkeydeveloper/passkey-authenticator-aaguids (aaguid.json).
// Intentionally small: most consumer authenticators are covered, and privacy-preserving platforms report an all-zero AAGUID that matches nothing here.
const authenticatorNames: Record<string, string> = {
  "ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4": "Google Password Manager",
  "adce0002-35bc-c60a-648b-0b25f1f05503": "Chrome on Mac",
  "08987058-cadc-4b81-b6e1-30de50dcbe96": "Windows Hello",
  "9ddd1817-af5a-4672-a2b9-3e3dd95000a9": "Windows Hello",
  "6028b017-b1d4-4c02-b4b3-afcdafc96bb2": "Windows Hello",
  "dd4ec289-e01d-41c9-bb89-70fa845d4bf2": "iCloud Keychain (Managed)",
  "fbfc3007-154e-4ecc-8c0b-6e020557d7bd": "Apple Passwords",
  "531126d6-e717-415c-9320-3d9aa6981239": "Dashlane",
  "bada5566-a7aa-401f-bd96-45619a55120d": "1Password",
  "b84e4048-15dc-4dd0-8640-f4f60813c8af": "NordPass",
  "0ea242b4-43c4-4a1b-8b17-dd6d0b6baec6": "Keeper",
  "f3809540-7f14-49c1-a8b3-8f813b225541": "Enpass",
  "771b48fd-d3d4-4f74-9232-fc157ab0507a": "Edge on Mac",
  "d548826e-79b4-db40-a3d8-11116f7e8349": "Bitwarden",
  "53414d53-554e-4700-0000-000000000000": "Samsung Pass",
  "50726f74-6f6e-5061-7373-50726f746f6e": "Proton Pass",
  "b78a0a55-6ef8-d246-a042-ba0f6d55050c": "LastPass",
  "d3452668-01fd-4c12-926c-83a4204853aa": "Microsoft Password Manager",
}

export function authenticatorName(aaguid?: string | null): string | null {
  if (!aaguid) return null
  return authenticatorNames[aaguid] ?? null
}
