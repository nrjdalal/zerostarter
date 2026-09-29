# syntax=docker/dockerfile:1
FROM oven/bun:1.4.0-alpine AS base
WORKDIR /app

FROM base AS prepare
COPY . .
RUN bunx turbo prune @api/hono --docker

FROM base AS builder
COPY --from=prepare /app/.github/scripts .github/scripts
COPY --from=prepare /app/out/json/ .
RUN bun install --frozen-lockfile --ignore-scripts
COPY --from=prepare /app/out/full/ .
RUN --mount=type=secret,id=dotenv,target=/app/.env,required=true bunx turbo run build --filter=@api/hono

FROM base AS runner
WORKDIR /app/api/hono
COPY --from=builder --chown=bun:bun /app/api/hono/bundle ./bundle

USER bun
# No node_modules here, so a bare specifier the bundle still carries (Better Auth's optional telemetry import) would make Bun fetch it from npm at runtime; with auto-install off it fails at once and the guarded import falls back
CMD ["bun", "--no-install", "bundle/index.mjs"]
EXPOSE 4000
