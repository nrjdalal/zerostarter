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
RUN bun run build

FROM base AS runner
WORKDIR /app
COPY --from=prepare /app/out/json/ .
COPY --from=prepare /app/out/bun.lock .
RUN bun install --frozen-lockfile --ignore-scripts --production
COPY --from=builder /app/api/hono/dist/ ./api/hono/dist/
COPY --from=builder /app/packages/auth/dist/ ./packages/auth/dist/
COPY --from=builder /app/packages/env/dist/ ./packages/env/dist/
COPY --from=builder /app/web/next/.next/ ./web/next/.next/
COPY --from=builder /app/web/next/.source/ ./web/next/.source/
COPY --from=builder /app/web/next/public/ ./web/next/public/

RUN chown -R bun:bun web/next/.next web/next/.source
USER bun
WORKDIR /app/web/next
CMD ["bun", "run", "start"]
EXPOSE 3000