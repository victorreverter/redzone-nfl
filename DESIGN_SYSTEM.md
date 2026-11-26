# Redzone NFL — Design & Development Pattern

A unified design system for the Redzone NFL web app, built around the **Gridiron Dark** palette, sharp brutalist geometry, and a curated four-font editorial/sports typography stack.

---

## 1. Typography System

All fonts are loaded via Google Fonts in `apps/web/index.html` and mapped in `apps/web/tailwind.config.js`:

| Role | Font Family | Tailwind Class | Weights | Usage |
|---|---|---|---|---|
| **Display / Headings** | **Bricolage Grotesque** | `font-display` | `600`, `700`, `800` | Page `h1`, section `h2`/`h3`, brand wordmark, hero titles. Tight tracking (`tracking-tight`). |
| **UI / Body** | **Inter** | `font-sans` | `400`, `500`, `600`, `700` | Default body copy, buttons, labels, navigation, form controls, card text. |
| **Data / Scoreboard** | **DM Mono** | `font-mono` | `400`, `500` | Scores (`26 - 23`), records (`8-2`), percentages (`74%`), kickoff times, seed numbers, status pills. Always pair with `tabular-nums`. |
| **Editorial Accent** | **Instrument Serif** | `font-serif` | `400` (regular & italic) | Editorial callouts, historical quotes, milestone subtitles (`MilestoneSlider`). Never mix with `font-display` on page `h1`s. |

### Typography Rules
1. **One page-heading voice**: Every page `h1` uses `font-display font-extrabold tracking-tight text-3xl md:text-5xl text-text-primary`. No mixing serif and sans across page headers.
2. **Reserve ALL CAPS for micro-labels & metadata**: Use `uppercase tracking-wider text-xs font-semibold` for badges, section eyebrows, column headers, and button labels. Keep multi-line descriptions, subtitles, and error/status sentences in **sentence case** (`font-normal` or `font-medium`) for readability.
3. **Tabular numerals everywhere**: All numeric readouts (scores, records, accuracy %, week numbers, counts) use `font-mono tabular-nums`.

---

## 2. Color Tokens

Defined in `apps/web/tailwind.config.js`:

| Token | Hex | Role |
|---|---|---|
| `gridiron-bg` | `#0a0a0f` | App canvas & input backgrounds |
| `gridiron-surface` | `#161620` | Primary cards, header, sidebar, modals |
| `gridiron-surface-hover` | `#20202e` | Interactive rows, hover surfaces, secondary buttons |
| `gridiron-border` | `#2a2a3a` | Structural 1px/2px borders |
| `nfl-red` | `#e04a2a` | Primary brand accent, live indicator, wrong prediction |
| `nfl-blue` | `#2e7fa4` | Secondary accent, selected pick highlight, focus rings |
| `nfl-green` | `#10b981` | Correct/exact result, saved confirmations, primary save action |
| `nfl-yellow` | `#f59e0b` | Division winners, #1 seeds, trophy/award accents |
| `text-primary` | `#f2e8d5` | Primary warm off-white ink |
| `text-secondary` | `#a4a4b8` | Secondary labels & body copy |
| `text-muted` | `#6c6c80` | Kickoff metadata, placeholders, tertiary hints |

---

## 3. Shape, Elevation & Interactive States

- **Sharp Geometry**: `borderRadius` stays crisp (`0` / `2px`) to preserve the broadcast-graphic gridiron aesthetic.
- **Calm State Signaling**:
  - **Pending / Saved pick**: Subtle status badge (`Saved`) + clean border—never heavy neon glow across the whole grid.
  - **Unsaved / Dirty edit**: Amber/blue dot or sticky bottom action bar showing unsaved count.
  - **Graded Final Game**: Green border/badge for Correct (`+1 pt`) or Exact (`+5 pts`), Red badge/subtle border for Wrong.
  - **Live Game (`in_progress`)**: Pulsing red `LIVE` badge + real-time score box.
- **Accessible Focus**: Every interactive element (`button`, `input`, `select`, `a`) gets `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nfl-blue`.

---

## 4. Layout & Responsive Patterns

- **Desktop (`lg+`)**: Fixed `w-60` left sidebar + scrollable main content area (`max-w-7xl mx-auto`).
- **Mobile (`< lg`)**: Sticky top header + **fixed bottom tab bar** for the 5 core views (`Dashboard`, `Schedule`, `Standings`, `Playoffs`, `Awards`), with `Settings` & `Admin` accessible from the top header / drawer. Add `pb-20 lg:pb-8` to `<main>` so content never hides behind the bottom bar.
- **Overflow Safety**: Use `overflow-x-clip` (not `overflow-hidden`) on the app shell so `position: sticky` works reliably for headers and sticky save bars.

---

## 5. Domain Conventions

- **NFL Matchup Order**: Always render **`AWAY @ HOME`** (away team on the left, `@` in the center, home team on the right) with subtle `AWAY` / `HOME` labels.
- **Automatic Week Rollover**: `/games/current-week/:seasonId` advances to the next week 4 hours after the previous week's last kickoff (Tuesday morning Europe/Amsterdam time after Monday Night Football), even if official scores haven't been synced yet.
- **PWA & Branding**: Custom **Gridiron Diamond** mark (split AFC crimson `#e04a2a` & NFC steel-blue `#2e7fa4` diamond framing a 45° pro football with stitched laces) exported as `logo-mark.svg`, `favicon.svg`, `favicon-32x32.png`, `apple-touch-icon.png`, `icon-192.png`, and `icon-512.png`.
