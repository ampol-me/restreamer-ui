# Repository guidelines

Phi Restream UI: a Nuxt 4 + Nuxt UI v4 front end for datarhei-core, run with Bun. It replaces the
React UI that now lives untouched in `legacy/` (reference only; do not edit it).

## Design

Every screen follows the Phila design system, vendored in `design/phila/` — read
`design/phila/PHILA-DESIGN.md` before touching UI. Tokens are mapped onto Nuxt UI in
`app/assets/css/main.css` and `app/app.config.ts`; use the token utilities (`bg-phila-gold`,
`text-ink-muted`, `border-line`, …) or Nuxt UI's semantic classes, never other colours. Logos are
used as supplied (`design/phila/assets/logos`, copied to `public/brand`).

## Layout

- `app/` – the Nuxt app (client-side only, `ssr: false`). Pages in `app/pages`, one dashboard layout
  in `app/layouts/default.vue`, components in `app/components` (auto-imported, path-prefixed:
  `components/channel/Foo.vue` is `<ChannelFoo>`).
- `shared/` – framework-free TypeScript: the core client (`shared/core/restreamer.ts`), metadata,
  coders, filters and publication services. Most of it is a 1:1 port of `legacy/src`, pinned by
  parity tests against golden data generated from the legacy code. Changing behaviour there means
  adding a test that states the new behaviour; never "tidy" a ported file into behaving differently.
- `server/` – Nitro routes for the viewer site (`/watch`): per-channel access (public, 6-digit
  passcode with limits, hidden), the page template and the HLS proxy. Rules live in
  `server/utils/viewer/`, the template model and its editing operations in `shared/viewer/`.
  It also takes the Studio's feed to the core (`server/api/studio`, `server/utils/studio/`):
  the browser posts its recording in pieces, ffmpeg on this server publishes it to the core's
  RTMP server. That needs `ffmpeg` next to the UI (`NUXT_FFMPEG_PATH`).
- Studio (`app/pages/[channelid]/studio.vue`): mixing happens in the browser
  (`app/composables/useStudioEngine.ts`: canvas + Web Audio); layouts, the remembered setup and
  the feed's ffmpeg arguments are framework-free in `shared/studio/`.
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
  palette classes. Icons: `i-lucide-*`. Status is shown with `<TallyBadge>` and always has a word.
- Forms: `UFormField` + inputs; destructive actions ask for confirmation in a `UModal`.
- Feedback through `useToast()`; errors say what failed in the user's terms.
- Keep comments to the why. No dead code, no commented-out code.
