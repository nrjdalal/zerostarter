#!/usr/bin/env node

/**
 * Generate alphanumeric password
 * Used by all database providers for secure password generation
 */
export const genAlphanumericPassword = (length = 24) => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = ""
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Generate a random subdomain/identifier
 * Useful for generating unique identifiers for database instances
 */
export const genRandomIdentifier = (length = 10) => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
