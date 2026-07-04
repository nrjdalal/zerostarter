export const WEB_URL = process.env.TESTS_WEB_URL || "http://localhost:3000"
export const API_URL = process.env.TESTS_API_URL || "http://localhost:4000"

// The web app's own origin, which the API trusts for CORS and agent sign-in.
export const TRUSTED_ORIGIN = WEB_URL
export const UNTRUSTED_ORIGIN = "https://evil.example.com"
