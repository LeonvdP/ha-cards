# HA cards

[![hacs](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://hacs.xyz)

Animated, consistent Home Assistant dashboard cards with visual editors and Dutch + English labels.

| Card | Docs |
|---|---|
| `custom:aircon-card` | [docs/cards/aircon-card.md](docs/cards/aircon-card.md) |
| `custom:heating-card` (Toon) | [docs/cards/heating-card.md](docs/cards/heating-card.md) |
| `custom:awning-card` (zonnescherm) | [docs/cards/awning-card.md](docs/cards/awning-card.md) |

<!-- Screenshots: add docs/images/*.png here (HACS's default list requires images in the README). -->

## Install with HACS (recommended)
1. **HACS → ⋮ → Custom repositories**, add this repository's URL, type **Dashboard**.
2. Search for **HA Cards**, download, and reload the browser.
3. HACS adds one resource, `/hacsfiles/ha-cards/ha-cards.js`, which contains all three cards.
4. Add a card from the card picker and set it up in the visual editor.

If you previously installed a card by hand (`/local/<name>-card.js`), **remove that resource** first: the same card can't be loaded twice.

## Install by hand
1. Copy `cards/<name>-card.js` to `/config/www/`.
2. **Settings → Dashboards → ⋮ → Resources → Add resource** → `/local/<name>-card.js?v=1`, type *JavaScript module*.
3. Hard-refresh, then add the card from the card picker and set it up in the visual editor.
4. After updating the file, raise the `?v=` number.

## Develop
See [docs/design-system.md](docs/design-system.md) and [docs/testing.md](docs/testing.md).
Open `preview/*.html` in a browser to try the cards without Home Assistant.

Each card is a single plain-JS file in `cards/`. For HACS, `npm run build` concatenates them into `dist/ha-cards.js`. Publishing a GitHub release does this automatically and attaches the file to the release.

## License
[MIT](LICENSE). The air-conditioner illustration is adapted from [skyrotter/ha-appliance-electromenager-cards](https://github.com/skyrotter/ha-appliance-electromenager-cards) (MIT); see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
