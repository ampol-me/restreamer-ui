ARG BUN_IMAGE=oven/bun:1.4-alpine

FROM $BUN_IMAGE AS builder

WORKDIR /ui

COPY package.json bun.lock ./
# Scripts are skipped: the postinstall (nuxt prepare) needs the sources, and the build prepares anyway.
RUN bun install --frozen-lockfile --ignore-scripts

COPY . .

# Path the app is served from, e.g. /app/ behind a reverse proxy on a shared host.
ARG NUXT_APP_BASE_URL=/
ENV NUXT_APP_BASE_URL=$NUXT_APP_BASE_URL

RUN bun run build

FROM $BUN_IMAGE

WORKDIR /ui

COPY --from=builder /ui/.output /ui/.output

# Viewer site settings and the cookie signing key live here: mount a volume.
VOLUME /ui/.data

ARG NUXT_APP_BASE_URL=/
ENV HOST=0.0.0.0 PORT=3000 NUXT_APP_BASE_URL=$NUXT_APP_BASE_URL
# NUXT_PUBLIC_CORE_ADDRESS: the core as seen from the browser (e.g. https://live.example.com);
#                           leave empty when the app is served from the core's own host
# NUXT_CORE_ADDRESS:        the core as seen from this container (e.g. http://core:8080)

EXPOSE 3000

CMD [ "bun", ".output/server/index.mjs" ]
