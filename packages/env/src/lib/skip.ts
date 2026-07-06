// Env-validation skip flags. `SKIP_ENV_VALIDATION` is the base "skip everything" escape hatch (the Next.js/t3-env/Docker convention); the scoped `_SERVER` / `_CLIENT` variants skip just one side. Base implies both.
const skipAll = process.env.SKIP_ENV_VALIDATION === "true"

export const skipClientValidation = skipAll || process.env.SKIP_ENV_VALIDATION_CLIENT === "true"
export const skipServerValidation = skipAll || process.env.SKIP_ENV_VALIDATION_SERVER === "true"
