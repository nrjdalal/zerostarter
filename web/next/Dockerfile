FROM oven/bun:latest AS base
WORKDIR /app

FROM base AS prepare
COPY . .
RUN bunx turbo prune @web/next --docker

FROM base AS builder
COPY .env ./.env
COPY --from=prepare /app/out/json/ .
RUN bun install --frozen-lockfile --ignore-scripts
COPY --from=prepare /app/out/full/ .
RUN bunx turbo run build --filter=@web/next

FROM base AS runner
WORKDIR /app/web/next
COPY --from=builder /app/web/next/.next/standalone /app
COPY --from=builder /app/web/next/.next/static ./.next/static
COPY --from=builder /app/web/next/public ./public
EXPOSE 3000
CMD ["bun", "server.js"]
