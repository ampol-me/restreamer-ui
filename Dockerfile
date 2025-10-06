# syntax=docker/dockerfile:1.7

FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json .
COPY bun.lockb . 2>/dev/null || true
RUN bun install --frozen-lockfile

FROM oven/bun:1 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM node:22-alpine3.19 AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
