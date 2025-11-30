FROM oven/bun:latest AS base

FROM base AS prepare
WORKDIR /app
RUN bun install --global turbo
COPY . .
RUN turbo prune @web/next --docker

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
COPY --from=builder /app/web/next/.next/standalone ./
COPY --from=builder /app/web/next/.next/static ./web/next/.next/static
COPY --from=builder /app/web/next/public ./web/next/public
USER bun
EXPOSE 4000
CMD bun web/next/server.js
