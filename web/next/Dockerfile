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
COPY --from=builder /app ./
RUN chown -R bun:bun web/next/.next web/next/.source

USER bun
WORKDIR /app/web/next
CMD ["bun", "run", "start"]
EXPOSE 3000