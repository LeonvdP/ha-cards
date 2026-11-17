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

Open `preview/aircon.html`, `preview/heating.html` or `preview/awning.html` straight in a browser (file:// works). Each page:
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
