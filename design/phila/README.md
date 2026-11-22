# Phila design system

One portable copy of the Phila design system for any project and any coding agent.
Online reference (same content): https://claude.ai/artifact/RH2igNcntbAmW9FVfQWzZH

| file | use |
|---|---|
| `PHILA-DESIGN.md` | **Read this first.** Rules: logo, colour, type, spacing, components, voice, motion |
| `tokens.json` | Source of truth for every token (light + dark) |
| `tokens.css` | CSS custom properties, light/dark, type classes `.ph-text-*`, loads IBM Plex |
| `tailwind.preset.js` | Tailwind v3 preset (`presets: [require(...)]`) |
| `tailwind-theme.css` | Tailwind v4 `@theme` (import after `tokens.css`) |
| `components/bundle.js` + `bundle.css` | React 18 components on `window.Phila`: Button, TextField, Card, TallyBadge, LowerThird |
| `components/index.d.ts`, `components/*.md` | Props and usage guidelines per component |
| `swift/PhilaColors.swift` | SwiftUI colours for macOS / iOS apps |
| `assets/logos/`, `assets/app-icons/` | Safe Frame logo SVGs and app-icon SVGs — use as-is, never redraw |

## Install for Claude Code (every project on this Mac)

```sh
./install.sh
```

It copies this folder to `~/.claude/phila-design-system/` and adds one import line to
`~/.claude/CLAUDE.md`, so Claude Code loads the rules in every project.

## Use inside one project

Copy the folder into the repo (for example `design/phila/`) and add to the project's `CLAUDE.md`:

```
@design/phila/PHILA-DESIGN.md
```

Web: `<link rel="stylesheet" href="design/phila/tokens.css">` then use `var(--phila-navy)`, `var(--surface)`, …
