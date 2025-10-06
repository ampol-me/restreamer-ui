# Repository Guidelines

## Project Structure & Module Organization
All runtime code lives in `src/` with Nuxt conventions: routes inside `src/pages/`, shared UI in `src/components/`, composables in `src/composables/`, and reusable clients under `src/lib/`. Global styling resides in `src/assets/`, while static files are served from `public/`. Build artifacts land in `.output/`; anything checked in there should be treated as generated. Keep serverless API handlers in `src/server/api/` should you add backend glue.

## Build, Test, and Development Commands
Install dependencies and generate `bun.lockb` with `bun install`. Start local development via `bun run dev` (Nuxt dev server on http://localhost:3000). Create a production bundle using `bun run build`, preview the output with `bun run preview`, and lint using `bun run lint`. Docker images expect a prebuilt `.output/` directory; use the provided multi-stage `Dockerfile`.

## Coding Style & Naming Conventions
Use `<script setup lang="ts">` and Composition API for new Vue components. Prefer PascalCase filenames for components (e.g., `ChannelList.vue`) and kebab-case routes (`pages/system/status.vue`). Extract data access into composables or `src/lib/` clients to keep templates declarative. ESLint is configured via `@nuxt/eslint-config`; fix all reported issues before opening a PR. Tailwind-like utility classes from `@nuxt/ui` are encouraged for layout, but encapsulate bespoke styling in `src/assets/css/main.css` when utilities are insufficient.

## Testing Guidelines
Adopt Nuxt’s built-in Vitest integration (add `@nuxt/test-utils` when introducing tests). Co-locate specs as `*.spec.ts` beside the components they verify. Mock HTTP calls with `$fetch.create` helpers and assert both loading and failure states exposed through the composables in `src/composables/`. Target scenario coverage for channel provisioning, publication management, and status polling.

## Commit & Pull Request Guidelines
Keep commits small, imperative, and scoped (e.g., `Add publication creation form`). Reference upstream issues with `#123` when relevant and include screenshots or screen recordings for UI-facing changes. PR descriptions should summarise validation steps (`bun run lint`, `bun run build`, any Vitest suites) and mention backend dependencies or configuration toggles that reviewers must apply.

## Deployment Notes
Workflow builds copy `.output/public` into the lightweight Caddy container defined in `Dockerfile.workflow`. Runtime deployments execute `.output/server/index.mjs` under Node 22; confirm environment variables like `NUXT_PUBLIC_API_BASE` are set before rolling out.
