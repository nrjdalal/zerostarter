# syntax=docker/dockerfile:1
FROM oven/bun:1.3.14-alpine AS base
WORKDIR /app

FROM base AS prepare
COPY . .
RUN bunx turbo prune @web/next --docker

FROM base AS builder
COPY --from=prepare /app/.github/scripts .github/scripts
COPY --from=prepare /app/out/json/ .
RUN bun install --frozen-lockfile --ignore-scripts
COPY --from=prepare /app/out/full/ .
ENV INTERNAL_API_URL=http://api:4000
RUN --mount=type=secret,id=dotenv,target=/app/.env,required=true bunx turbo run build --filter=@web/next
# takumi (OG rendering) is external to the Nitro bundle (see web/next/vite.config.ts), and the bun
# preset does not copy externals into .output, so materialize the takumi closure into
# .output/server/node_modules where the server's bare `import "takumi-js"` resolves at runtime.
RUN set -eux; \
  NM=/app/web/next/.output/server/node_modules; \
  mkdir -p "$NM/@takumi-rs"; \
  cp -RL /app/node_modules/.bun/takumi-js@*/node_modules/. "$NM/"; \
  cp -RL /app/web/next/node_modules/@takumi-rs/. "$NM/@takumi-rs/"; \
  cd /app/web/next/.output/server && bun -e 'await import("takumi-js")'

FROM base AS runner
WORKDIR /app/web/next
COPY --from=builder --chown=bun:bun /app/web/next/.output ./.output

USER bun
ENV PORT=3000
CMD ["bun", ".output/server/index.mjs"]
EXPOSE 3000
