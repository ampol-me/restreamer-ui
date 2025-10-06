# Restreamer UI

Modern control plane for managing datarhei Restreamer deployments, now built with Nuxt 4.1.2 and the @nuxt/ui 4 design system.

## Getting Started

```bash
bun install
bun run dev
```

The dashboard automatically targets the same origin as the API. Override it with `NUXT_PUBLIC_API_BASE=https://restreamer.example.com`.

## Project Layout

Nuxt sources live under `app/` (`app/pages`, `app/components`, `app/composables`, `app/lib`, `app/assets`). Static files that should bypass Vite go in `public/`. Builds output to `.output/`.

## Scripts

- `bun run dev` – start a local development server with hot-module reloading.
- `bun run build` – create a production build in `.output`.
- `bun run preview` – serve the built output locally.
- `bun run lint` – run ESLint using the official Nuxt flat config.

## Testing new channels/publications

POST to `/api/channels` or `/api/publications` endpoints to persist demo entities. Samples are pre-configured in the “Channels” and “Publications” views using the Nuxt composables.

## Deployment

A multi-stage `Dockerfile` is provided. Build and run it with Bun-driven installs:

```bash
docker build -t restreamer-ui .
docker run --rm -p 3000:3000 restreamer-ui
```

Static assets are exposed from `.output/public` and served by the workflow Caddy container.

## License

See the [LICENSE](./LICENSE) file for licensing information.
