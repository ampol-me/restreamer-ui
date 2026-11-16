# Repository guidelines

Phi Restream UI: a Nuxt 4 + Nuxt UI v4 front end for datarhei-core, run with Bun. It replaces the
React UI that now lives untouched in `legacy/` (reference only; do not edit it).

## Layout
- `app/` – the Nuxt app (client-side only, `ssr: false`). Pages in `app/pages`, one dashboard layout
  in `app/layouts/default.vue`, components in `app/components` (auto-imported, path-prefixed:
  `components/channel/Foo.vue` is `<ChannelFoo>`).
- `shared/` – framework-free TypeScript: the core client (`shared/core/restreamer.ts`), metadata,
  coders, filters and publication services. Most of it is a 1:1 port of `legacy/src`, pinned by
  parity tests against golden data generated from the legacy code. Changing behaviour there means
  adding a test that states the new behaviour; never "tidy" a ported file into behaving differently.
- `server/` – Nitro routes for the View Portal only (passcode, sessions, HLS proxy).
- `i18n/locales/*.json` – generated from the legacy catalogs (`bun run i18n:convert`). Messages are
  keyed by their English text: write `$t('Save')` / `t('Edit: {title}', { title })`; untranslated
  keys render as the key.
- `scripts/legacy/` – tooling that runs the legacy code under Bun to produce golden fixtures.

## Commands
- `bun run dev` – dev server. `bun scripts/dev/fake-core-server.ts` starts a fake core on :3222
  (login `admin` / `secret`); open the UI with `?address=http://localhost:3222`.
- `bun run test` (bun:test), `bun run lint`, `bunx nuxt typecheck`, `bun run format`, `bun run build`.
  All four checks must be clean before a commit.

## Conventions
- Tabs (width 4), single quotes, semicolons, 160 columns (Prettier). TypeScript strict; no `any` in
  `app/` or `server/` (extend `shared/core/types.ts` – the typed view of the core client – instead).
- Talk to the core only through `useRestreamer().api()` (typed `CoreClient`). Poll with `usePolling`.
- Pages render a `UDashboardPanel` with a `UDashboardNavbar` header (see `app/pages/[channelid]/index.vue`).
  Use Nuxt UI components and semantic colour classes (`text-muted`, `bg-elevated`, …), never raw
  palette classes. Icons: `i-lucide-*`.
- Forms: `UFormField` + inputs; destructive actions ask for confirmation in a `UModal`.
- Feedback through `useToast()`; errors say what failed in the user's terms.
- Keep comments to the why. No dead code, no commented-out code.
