FROM oven/bun:latest AS base

FROM base AS prepare
WORKDIR /app
RUN bun install --global turbo
COPY . .
RUN turbo prune @web/next --docker

FROM base AS builder
WORKDIR /app
COPY --from=prepare /app/.env .
COPY --from=prepare /app/.github/ ./.github/
COPY --from=prepare /app/out/json/ .
COPY --from=prepare /app/out/bun.lock .
RUN bun install --frozen-lockfile --ignore-scripts
COPY --from=prepare /app/out/full/ .
ENV NODE_ENV=production
RUN bun run build

FROM base AS runner
WORKDIR /app
COPY --from=builder /app/node_modules/ ./node_modules/
# @web/next
COPY --from=builder /app/web/next/.next/ ./.next/
COPY --from=builder /app/web/next/package.json .
COPY --from=builder /app/web/next/public/ ./public/
# @api/hono
COPY --from=builder /app/api/hono/dist/ ./api/hono/dist/
COPY --from=builder /app/api/hono/package.json ./api/hono/
# @packages/auth
COPY --from=builder /app/packages/auth/dist/ ./packages/auth/dist/
COPY --from=builder /app/packages/auth/package.json ./packages/auth/
# @packages/env
COPY --from=builder /app/packages/env/dist/ ./packages/env/dist/
COPY --from=builder /app/packages/env/package.json ./packages/env/

USER bun
CMD ["bun", "run", "start"]
EXPOSE 3000