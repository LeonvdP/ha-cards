# awning-card

Animated lateral-arm awning (zonnescherm) card for Home Assistant, in the same style as `aircon-card` and `heating-card`.
Works with **open / stop / close scripts or buttons + an open/closed sensor**, or with a `cover` entity.

What it shows:
- **House front with the awning.** The striped fabric rolls out and in, and the valance and the shadow on the terrace grow with it. Sunlight on the wall fades as the awning comes out, and the motor LED blinks while it moves. In strong wind the fabric flutters.
- **Status line.** Dicht / Open / Deels open · 70% / Uitrollen… / Inrollen…
- **Buttons.** Open / Stop / Dicht. The button for the current movement shows a progress line.
- **Position bar.** Shows the (estimated) position as a percentage. It slides away while the awning is closed.
- **Tiles.** The sensor's own state, plus wind and outdoor temperature if you add them.
- **Alerts.** A wind warning above `wind_max`, and "Sensor meldt nog open na inrollen" if the sensor doesn't report closed within 15 s after the estimated close time.

## How the position is estimated

A contact sensor only knows *closed* or *not closed*, so the card times the movement:
- **Open:** counts up from the current position over `travel_time` seconds.
- **Dicht:** counts down. When the sensor reports closed, the position becomes 0% right away.
- **Stop:** freezes the estimate, for example "Deels open · 60%".
- **Opened with the remote:** if the sensor reports open while the card thought it was closed, the card shows it as fully open.

Measure `travel_time` once: time a full run from closed to open. A 5 m awning usually takes about 40–60 s.
The estimate is kept per browser. A phone and a tablet can differ after a Stop, but they agree again at the next full open or close.

If you ever get a `cover` entity with a real position, set `entity`; the card then uses the real position instead of the estimate.

## Install

1. Copy `awning-card.js` to `/config/www/awning-card.js`.
2. **Settings → Dashboards → ⋮ → Resources → Add resource**: `/local/awning-card.js?v=1`, type **JavaScript module**.
3. Hard-refresh, then **Add card → "Awning card"**. The card pre-fills entities with "zonnescherm" in their id; check them in the visual editor.

## Example

```yaml
type: custom:awning-card
name: Zonnescherm
status_entity: binary_sensor.zonnescherm_status
open: script.zonnescherm_open        # script, button, input_button, scene, switch or automation
stop: script.zonnescherm_stop
close: script.zonnescherm_dicht
travel_time: 50
fabric: blue                         # blue, red, green, grey, sand, anthracite, anthracite_white, orange, yellow
wind: sensor.windsnelheid            # optional
wind_max: 30                         # km/h, optional
temperature: sensor.buiten_temperatuur
```

## Options

| Option | Description |
|---|---|
| `status_entity` | Open/closed sensor (`binary_sensor`: on = open; or a sensor with open/closed text) |
| `invert_status` | `true` if your sensor reports `on` when the awning is closed |
| `open`, `stop`, `close` | Entity to run per button, or a full action object (`{action: perform-action, perform_action: …}`) |
| `entity` | Optional `cover` entity (used when a button has no entity, and for the real position) |
| `travel_time` | Seconds for a full open run (default 45) |
| `fabric` | Stripe colour preset, or `[dark, light]` hex colours |
| `wind`, `wind_max` | Wind sensor and warning threshold (default 30) |
| `temperature`, `tiles` | Extra tiles |
| `open_button`, `stop_button`, `close_button` | Override `name`, `icon`, `color` of a button |
| `show_sensor` | `false` hides the sensor tile (the status line already shows open/closed) |
| `show_position`, `hide_buttons`, `tap_action` | Layout / tap behaviour |
