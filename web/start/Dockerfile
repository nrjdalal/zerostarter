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
RUN cp -r /app/web/next/.next/static /app/web/next/.next/standalone/web/next/.next/static
RUN cp -r /app/web/next/public /app/web/next/.next/standalone/web/next

FROM base AS runner
WORKDIR /app/web/next
COPY --from=builder --chown=bun:bun /app/web/next/.next/standalone /app
RUN mkdir -p .next && chown bun:bun .next

USER bun
CMD ["bun", "server.js"]
EXPOSE 3000
