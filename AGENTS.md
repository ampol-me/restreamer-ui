# Repository Guidelines

## Project Structure & Module Organization
Source lives in `src/`, with feature-specific views under `src/views`, shared UI primitives in `src/misc`, and state/context helpers in `src/contexts`, `src/hooks`, and `src/utils`. `src/theme` centralizes MUI theming, while `src/assets` and `public/` hold static media. Localized messages live in `src/locales`; update `src/version.js` when bumping bundles. Global Jest setup resides in `src/setupTests.js`.

## Build, Test, and Development Commands
- `yarn start`: Launch CRA dev server with hot reload.
- `yarn build`: Produce optimized production bundle (`build/`).
- `yarn start-build`: Serve the compiled bundle locally via `serve`.
- `yarn format`: Run Prettier formatting across `src/`.
- `yarn i18n-extract` / `yarn i18n-compile`: Sync Lingui catalogs before and after copy changes.

## Coding Style & Naming Conventions
EditorConfig enforces tab-indented JavaScript (size 4) and LF endings; Markdown uses spaces. Follow Prettier defaults (`.prettierrc`) for quotes and semicolons, and run `yarn format` before pushing. Components stay PascalCase (`ChannelList`), hooks camelCase prefixed with `use`, and translation keys mirror their logical path (e.g., `views.edit.title`). CRA’s built-in ESLint validates during builds—fix warnings proactively.

## Testing Guidelines
Tests use Jest with React Testing Library; colocate specs as `*.test.js` alongside the code (see `src/views/Edit/Wizard/index.test.js`). Use `yarn test` for watch mode, `yarn test-ci` in pipelines, and `yarn test-coverage` to track thresholds before major changes. Prefer user-centric assertions (`screen.getByRole`) and mock network calls via existing utilities in `src/utils`. Keep fixtures under `src/misc` to avoid duplication.

## Commit & Pull Request Guidelines
Commits in history favor concise, imperative summaries (“Fix chromecast support”, “Update language files”) with optional issue references `(#123)`. Scope each commit per feature or fix, and include translation updates or build artifacts in separate commits when practical. Pull requests should describe the change, outline testing steps, reference linked issues, and attach UI screenshots or screencasts when visuals shift. Ensure CI passes and i18n catalogs stay current before requesting review.

## Localization Workflow
Run `yarn i18n-extract:clean` after updating strings to drop obsolete keys, then commit updated `src/locales/**`. Verify new translations render by launching `yarn start` and toggling the locale switcher in the header. Keep translated copy concise to preserve layout within responsive breakpoints.
