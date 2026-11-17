# Design system

All cards share one layout and one visual language. The CSS for it is **duplicated in each card file** (each card must stay a single file you can drop into `/config/www`), so a change to anything in this document must be made in every card.

## Layout

```
┌ ha-card ─────────────────────────────────────────────┐
│ ┌ .illus ┐  .head  .name          (16px / 600)       │
│ │ SVG    │         ● .status       (13px, dot = --c)  │
│ │120×140 │         ! .alert        (red, optional)    │
│ │        │  .stats  [.tile][.tile]  2 columns         │
│ └────────┘          [.tile][.tile]                    │
│ (.chips  status lights — heating only)                │
│ .modes   [btn][btn][btn]   grid, --n columns          │
│ .controls (collapsible panel)                         │
│   .crow  icon · label ············ value / control    │
│   .crow  …                                            │
└───────────────────────────────────────────────────────┘
```

- **Padding and gaps:** padding 14px, vertical gap 12px. The illustration is 116px wide (84px when the card is narrower than 340px, via a container query), aspect 120/140, with a 16px radius and a subtle radial background.
- **Tiles** (`.tile > .val + .lbl(icon + text)`): 10px radius, background `rgba(127,127,127,.09)`. Tapping a tile opens more-info for its entity.
- **Buttons** (`.mode`):
  - 12px radius, icon 22px above a 12px label.
  - Each button has its own colour `--mc`. Active state: filled with `--mc`, text colour `--mt` (white or a dark tint for light colours), a soft coloured shadow, and an animated icon (spin, flicker…).
  - Press feedback: a ripple, and a `busy` shimmer while the call runs.
- **Controls panel** (`.controls > .cin > .crow`):
  - One rounded block with dividers between rows.
  - It collapses with the `grid-template-rows: 0fr` trick (`.controls.closed`) when it isn't relevant.
  - Row types: the target stepper (−, value, + inside round 32px buttons), a pill `<select>` (`.sel`) and an iOS-style switch (`.sw`, `role="switch"`).
- **Card glow:** `ha-card.on::before` draws a radial tint of `--c` from the top left.

## Colour

- `--c` is the card's current accent, set by status classes on `.wrap` (`s-cool`, `s-heat`, `s-heating`, `s-open`, …). Off or idle uses `--disabled-text-color`.
- Use HA theme variables first (`--state-climate-cool-color`, `--state-climate-heat-color`, `--error-color`, `--primary-text-color`, `--secondary-text-color`, `--card-background-color`), with fixed fallbacks.
- Fixed palette:

| Use | Colour |
|---|---|
| Cool | `#4fc3f7` |
| Heat | `#ff8a3d` |
| Dry | `#7fd6c0` |
| Fan | `#9fb3c4` |
| Auto | `#b39ddb` |
| Hot water | `#29b6f6` |
| Awning "sun" | `#ffb300` |
| Holiday | `#64b5f6` |

- `color-mix(in srgb, …)` is used for tints; HA's frontend browsers support it.

## Illustrations

- **Format:**
  - SVG `viewBox="0 0 120 140"`, drawn as a slightly realistic product illustration: white or steel gradients, a soft shadow, a small dark LCD with a monospace glow and a status LED.
  - All ids use the `ID-` prefix, which is replaced per instance (`.replace(/ID-/g, uid + "-")`) so several cards on one page don't clash.
- **Animation:**
  - Driven only by **classes on `.wrap`**, with CSS keyframes per state: airflow dashes, snowflakes, droplets, flame flicker, pipe flow, puffs.
  - The awning is the exception: its fabric geometry is computed in JS (`_draw(p)`), and only while it moves.
  - Always respect `prefers-reduced-motion` and the `paused` host attribute.
- **Performance:**
  - Animate `transform`, `opacity` and `stroke-dashoffset`.
  - Avoid animating `box-shadow`/`filter` and using `mix-blend-mode`. For pulse dots, use a `::after` that scales and fades.

## Behaviour conventions

- **Tap targets:**
  - Tapping the illustration runs `tap_action` if set; otherwise it opens more-info for the main entity.
  - Tapping the name or status opens more-info.
  - Tiles and chips open their own entity.
- **Actions:** a button can run `script: script.x`, an entity to "press" (the awning card picks the service by domain), or a full HA action object (`action: perform-action`, `perform_action`, `data`, `target`, plus `navigate`, `url`, `more-info`). A `script.foo` shorthand becomes `script.turn_on`.
- **Optimistic state:** see `_pend`/`_pv()` in each card. Show the requested value right away, fall back after 6 s if HA doesn't confirm it.
- **Hiding:** unknown or unavailable values hide their tile rather than showing "—", and panels collapse when nothing in them applies.
- **i18n:** every user-facing string goes through `_t(key)` with `en` and `nl` entries.
- **Editor:**
  - Sections with headings and hints, built from `ha-form` schemas with selectors (`entity` with domain/device_class, `select`, `number`, `boolean`, `icon`).
  - List items (buttons) get their own bordered block with up/down/remove controls and an "add" button.
  - Emitted config: `type` first, default values omitted, empty fields deleted, YAML-only values preserved.

## Card API checklist for a new card

1. `setConfig`; a gated `set hass` with `_changed()`; `connectedCallback`/`disconnectedCallback` with `_observe()` (IntersectionObserver).
2. `getCardSize`, `getGridOptions() { columns: 12, min_columns: 6, rows: "auto" }`.
3. `static getConfigElement()` (with the `loadCardHelpers` trick that loads `ha-form`) and `static getStubConfig(hass)` that guesses entities by name.
4. A `window.customCards.push({ type, name, description, preview: true })` entry.
5. A version constant and a `console.info` banner.
6. A preview page in `preview/`, a doc in `docs/cards/`, and a row in the CLAUDE.md table.
