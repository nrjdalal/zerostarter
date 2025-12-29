export async function loadInfisicalSecrets() {
  const clientId = process.env.INFISICAL_CLIENT_ID
  const clientSecret = process.env.INFISICAL_CLIENT_SECRET
  const environment = process.env.INFISICAL_ENVIRONMENT || process.env.NODE_ENV || "dev"
  const projectId = process.env.INFISICAL_PROJECT_ID
  const siteUrl = process.env.INFISICAL_SITE_URL

  // Only proceed if required Infisical credentials are present
  if (!clientId || !clientSecret || !projectId) {
    return
  }

  try {
    // Dynamic import to avoid loading Infisical SDK if not needed
    const { InfisicalSDK } = await import("@infisical/sdk")

    const client = new InfisicalSDK({
      // Optional: defaults to https://app.infisical.com
      siteUrl: siteUrl || undefined,
    })

    // Authenticate with Infisical
    await client.auth().universalAuth.login({
      clientId,
      clientSecret,
    })

    // Fetch all secrets from Infisical
    const secrets = await client.secrets().listSecretsWithImports({
      environment,
      projectId,
      expandSecretReferences: true,
      viewSecretValue: true,
      recursive: true,
    })

    // Secrets from .env files override Infisical secrets if they exist
    for (const secret of secrets) {
      if (secret.secretKey && secret.secretValue) {
        // Only set if not already set (allows .env files to take precedence)
        if (!(secret.secretKey in process.env)) {
          process.env[secret.secretKey] = secret.secretValue
        }
      }
    }

    console.log(
      `[@packages/env] Loaded ${secrets.length} secrets from Infisical (project: ${projectId}, environment: ${environment})`,
    )
  } catch (error) {
    console.error("[@packages/env] Failed to load secrets from Infisical:", error)
    // Don't throw - allow fallback to .env files
  }
}
