FROM oven/bun:latest AS base

FROM base AS prepare
WORKDIR /app
RUN bun install --global turbo
COPY . .
RUN turbo prune @api/hono --docker

FROM base AS builder
WORKDIR /app
COPY --from=prepare /app/.github/ ./.github/
COPY --from=prepare /app/out/json/ .
COPY --from=prepare /app/out/bun.lock .
RUN bun install --frozen-lockfile
COPY --from=prepare /app/out/full/ .
RUN bun run build

FROM base AS runner
WORKDIR /app
COPY --from=builder /app/api/hono/dist/ ./dist/
COPY --from=builder /app/api/hono/package.json .
COPY --from=builder /app/node_modules/ ./node_modules/
COPY --from=builder /app/packages/ ./packages/
USER bun
EXPOSE 4000
CMD bun dist/index.mjs
