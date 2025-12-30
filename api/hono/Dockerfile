FROM oven/bun:latest AS base

FROM base AS prepare
WORKDIR /app
RUN bun install --global turbo
COPY . .
RUN turbo prune @api/hono --docker

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
# @api/hono
COPY --from=builder /app/api/hono/dist/ ./dist/
COPY --from=builder /app/api/hono/package.json .
# @packages/auth
COPY --from=builder /app/packages/auth/dist/ ./packages/auth/dist/
COPY --from=builder /app/packages/auth/package.json ./packages/auth/
# @packages/db
COPY --from=builder /app/packages/db/dist/ ./packages/db/dist/
COPY --from=builder /app/packages/db/package.json ./packages/db/
# @packages/env
COPY --from=builder /app/packages/env/dist/ ./packages/env/dist/
COPY --from=builder /app/packages/env/package.json ./packages/env/

USER bun
CMD ["bun", "run", "start"]
EXPOSE 4000