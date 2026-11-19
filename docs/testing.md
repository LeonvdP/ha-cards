# Testing

There is no Home Assistant in this repo. The cards are tested against **fake HA objects** in `preview/`. Everything below runs offline.

## Setup

```bash
npm install                                   # @mdi/js for the icon subset
pip install playwright && playwright install chromium   # or: export CHROME=/path/to/chrome
npm run icons                                 # regenerate preview/icons.js after adding an mdi: icon
npm run check                                 # node --check on all cards
```

## Preview pages

Open any `preview/*.html` page in a browser (file:// works in most browsers; otherwise serve the repo with any static server). Each page:
- builds a fake `hass` object: `states`, `locale.language: "nl"`, and a `callService` that simulates HA updating state after a short delay;
- renders cards with realistic configs;
- has buttons to toggle light/dark and to force states:
  - **aircon:** "compressor at target"
  - **heating:** `sim('heat' | 'dhw' | 'idle' | 'ot')`
  - **awning:** wind and fabric colour.

The awning preview uses `travel_time: 10` so a full run can be watched, and clears localStorage on load.

## Scripts

| Command | What it checks |
|---|---|
| `python3 tools/screenshot.py preview/heating.html out.png "sim('heat')" --light --scale 2` | Visual check of a state; prints page errors |
| `python3 tools/perf.py` | Awning loop: about 30 draws/s while opening, 0 renders for unrelated hass updates. **Run after any animation change** |
| `python3 tools/editor-test.py awning` | Drives the visual editor through a fake `ha-form` and prints the emitted configs |
| `python3 tools/capture.py [card…]` | Makes the README images (`docs/images/<card>.gif` dark + animated, `<card>.png` light). Needs ffmpeg. Runs in CI on every card change |
| `python3 tools/bundle-preview.py awning` | Inlines everything into `dist/awning-preview.html`, for sharing a preview as a single page |

To check one part of the drawing closely, screenshot with `--scale 2` and set a state directly. For the awning:

```js
const el = document.querySelector('awning-card');
el._mem = { p: 0.65, motion: null };          // set the estimated position
states['binary_sensor.zonnescherm_status'] = S('on'); push();
```

## Limits

- `preview/editor.html`'s `ha-form` is a plain-input stand-in. It doesn't show HA's real pickers, so layout problems in the real editor only show up in HA.
- Real-world quirks (integration attribute names, Toon behaviour, the timing of the Zigbee sensor) can only be confirmed in a real Home Assistant.

The appliance previews (`dishwasher.html`, `washer.html`, `dryer.html`) share `preview/_appliance.js`: Home Connect-style entities and `sim('off' | 'ready' | 'run' | 'alt' | 'pause' | 'finished' | 'door' | 'error' | 'alert')`. Each page also shows a second card fed only by a smart-plug power sensor. `hood.html` has `sim('off' | 's1' | 's2' | 's4' | 'boost' | 'light' | 'cook' | 'filter')` and shows a `fan`-based hood, a `select`-based hood and a read-only hood fed by an `input_select` (off/low/medium/high), an `input_boolean` light and a power sensor.
`petflap.html` fakes a Sure Petcare flap (three locks that answer `lock.lock` / `lock.unlock`, battery, connectivity) and two cats, with `sim('cat' | 'cat2' | 'battery' | 'offline' | 'night')`; left one cat, right two.
`waste.html` fakes the Afvalwijzer sensors with dates relative to today and has `sim('today' | 'tomorrow' | 'two' | 'later' | 'none' | 'notif')`; it shows grey containers with coloured lids and a fully coloured set limited to 14 days.

If your browser has *reduce motion* switched on, the cards don't animate (by design). Playwright tools force `reduced_motion="no-preference"`.
