# Phila design system — rules for this repo

Every screen, page, document and asset in this project follows the Phila design system.
Source of truth: https://claude.ai/artifact/RH2igNcntbAmW9FVfQWzZH (tokens, components, brand book).
Brand files: `assets/logos/` and `assets/app-icons/` beside this file (full PNG/icns/favicon/broadcast set: `phila-brand-kit.zip`, ask the owner). Never redraw the logo.
Machine-readable: `tokens.json` · `tokens.css` · `tailwind.preset.js` (v3) · `tailwind-theme.css` (v4) · `components/` · `swift/PhilaColors.swift`.

## Logo — "Safe Frame"
- Four rounded safe-area corner brackets around a gold play button. Use the supplied SVG/PNG only.
- Light backgrounds: `phila-mark` (navy frame + gold play). Navy/dark backgrounds: `phila-mark-reverse` (white frame + gold play). On gold: `phila-mark-black`.
- 32 px and below: the `-small` variant (heavier stroke). Clear space ≥ ¼ of the mark's width.
- Never stretch, rotate, recolour, add shadows, separate the play from the frame, or put white on gold.
- App icons: navy tile + white frame + one gold glyph in the 27–73 area of a 100 grid. macOS 16/32 px use the heavy frame.

## Colour tokens (light / dark)
| token | light | dark | use |
|---|---|---|---|
| phila-navy | #28428C | #28428C | structure, header bars, dark blocks |
| phila-gold | #E8B774 | #E8B774 | primary action fill, highlights (≤ 10–15% of area) |
| surface | #FBF8F3 | #0F1524 | page background |
| surface-raised | #FFFFFF | #172038 | cards, panels, menus |
| ink | #141B2E | #F3EEE6 | primary text |
| ink-muted | #5B6275 | #A9B0C2 | secondary text |
| gold-text | #8A5A14 | #E8B774 | gold-coloured text on surfaces |
| navy-text / link | #28428C | #9DB3EC | links, emphasis |
| on-gold | #141B2E | #141B2E | text on gold (never white) |
| on-navy | #FFFFFF | #FFFFFF | text on navy |
| line | #E7DFD2 | #2A3552 | hairlines, card borders |
| line-strong | #8C8577 | #6B7697 | input and secondary-button borders |
| tally-live | #C62F26 | #FF6B5F | Program / ON AIR / error — always with a word (LIVE, PGM) |
| tally-ready | #1F7A4D | #5FCF8E | Preview / ready / success — always with a word (PVW) |
| focus-ring | #28428C | #E8B774 | 2 px solid focus ring, 2 px offset |

Text must meet 4.5:1 on its background in both themes. Dark theme is deep navy, not black.

## Type
- IBM Plex Sans Thai (Thai + Latin) for UI and documents; IBM Plex Mono for timecode, IPs, numbers in tables.
- Google Fonts: `https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap`
- Scale (size/line-height · weight): display 56/60·700 · title 32/40·600 · heading 20/30·600 · body 16/28·400 · small 14/22·400 · label 12/16·600 (+0.06em, uppercase) · timecode 14/20 mono·500.
- Thai body text line-height ≥ 1.6. Native Apple apps may use SF but keep this scale and weights.

## Space, radius, elevation
- Spacing 4 px steps: 4, 8, 12, 16, 24, 32. Card padding 16, group gap 24.
- Radius: 6 (badges, inputs) · 12 (buttons, cards, panels) · full (tally dots, pills).
- Separate layers with surface colour and hairlines — no heavy shadows, no coloured left-border cards, no gradients.

## Components (behaviour to copy, whatever the framework)
- Button: primary = gold fill + on-gold text (one per group); secondary = surface-raised + line-strong border; ghost = navy-text. Min height 44 px (32 px dense toolbars).
- TextField: visible label always, hint below, error replaces hint in tally-live and sets aria-invalid.
- Card: surface-raised, 1 px line border, radius 12, optional uppercase gold-text eyebrow.
- TallyBadge: pill with dot + word — LIVE (tally-live), PVW / READY (tally-ready), OFF (ink-muted).
- LowerThird (on-air graphics): navy block with reverse mark + white plate + 6 px gold right edge; fixed colours.

## Voice
- Thai first; keep industry terms in English (Program, Preview, Tally, SDI, DeckLink).
- Short, direct sentences that say what the tool does. No hype words, no emoji in UI.
- Product names: "Phila" + name, title case — Phila Cam Link, Phila Clear, Phila Cine View.

## Motion
- UI 120–200 ms; graphics in 300–500 ms, out 200–300 ms. Ease in `cubic-bezier(.2,.8,.2,1)`, out `cubic-bezier(.4,0,1,1)`.
- Respect Reduce Motion. Never spin or bounce the logo; only a LIVE tally dot may blink (1 Hz).

## CSS variables (web projects)
```css
:root{--phila-navy:#28428c;--phila-gold:#e8b774;--surface:#fbf8f3;--surface-raised:#fff;--ink:#141b2e;--ink-muted:#5b6275;--gold-text:#8a5a14;--navy-text:#28428c;--on-gold:#141b2e;--line:#e7dfd2;--line-strong:#8c8577;--tally-live:#c62f26;--tally-ready:#1f7a4d;--focus-ring:#28428c;--radius-sm:6px;--radius-md:12px;--font-sans:"IBM Plex Sans Thai",system-ui,sans-serif;--font-mono:"IBM Plex Mono",ui-monospace,monospace}
@media (prefers-color-scheme:dark){:root{--surface:#0f1524;--surface-raised:#172038;--ink:#f3eee6;--ink-muted:#a9b0c2;--gold-text:#e8b774;--navy-text:#9db3ec;--line:#2a3552;--line-strong:#6b7697;--tally-live:#ff6b5f;--tally-ready:#5fcf8e;--focus-ring:#e8b774}}
```

## SwiftUI (Apple projects)
```swift
extension Color {
    static let philaNavy = Color(red: 0x28/255, green: 0x42/255, blue: 0x8C/255)
    static let philaGold = Color(red: 0xE8/255, green: 0xB7/255, blue: 0x74/255)
    static let tallyLive = Color(red: 0xC6/255, green: 0x2F/255, blue: 0x26/255)
    static let tallyReady = Color(red: 0x1F/255, green: 0x7A/255, blue: 0x4D/255)
}
// AccentColor asset: navy #28428C (Any Appearance) / gold #E8B774 (Dark) — gold as a tint on light
// backgrounds fails contrast. Gold-filled primary buttons use on-gold (#141B2E) text. Prefer system semantic colours
// for surfaces/text so Light/Dark mode stays native; the dark values above are the reference.
```
