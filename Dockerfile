ARG BUN_IMAGE=oven/bun:1.4-alpine

FROM $BUN_IMAGE AS builder

WORKDIR /ui

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM $BUN_IMAGE

WORKDIR /ui

COPY --from=builder /ui/.output /ui/.output

# Portal settings and the session signing key live here: mount a volume.
VOLUME /ui/.data

ENV HOST=0.0.0.0 PORT=3000
# NUXT_PUBLIC_CORE_ADDRESS: the core as seen from the browser (e.g. https://live.example.com)
# NUXT_CORE_ADDRESS:        the core as seen from this container (e.g. http://core:8080)

EXPOSE 3000

CMD [ "bun", ".output/server/index.mjs" ]
