# heating-card

Animated central-heating card for Home Assistant, in the same style as `aircon-card`. Made for **Toon** (Eneco) but works with any `climate` entity; the boiler sensors are optional.

What it shows:
- **Boiler illustration.** The flame grows with the modulation level, the CV pipes flow while heating, the tap drips for hot water and the flue puffs while the burner is on. The display shows the room temperature, "WW" for hot water or "Err" on a fault; the red LED blinks on a fault.
- **Status line.** Aan het verwarmen / Warm water / Voorverwarmen / Op temperatuur / Vakantiemodus, plus the active preset and the target temperature. A red alert line appears when OpenTherm or the boiler status reports a problem.
- **Tiles.** Room temperature, humidity (hidden while it's `unknown`) and modulation.
- **Boiler status lights.** Brander, CV, Warm water, Voorverwarmen, OpenTherm and Status. Each light comes on while it's active; OpenTherm and Status turn red on a problem. Tap one for its history.
- **Preset buttons.** Comfort / Thuis / Slapen / Weg; the active preset is highlighted.
- **Controls.** Target temperature (+/−), the Programma switch (with a "Tijdelijk aangepast" badge when the program is overridden) and the Vakantiemodus switch.

## Install

1. Copy `heating-card.js` to `/config/www/heating-card.js`.
2. **Settings → Dashboards → ⋮ → Resources → Add resource**: `/local/heating-card.js?v=1`, type **JavaScript module**.
3. Hard-refresh, then **Add card → "Heating card"**. The card tries to pre-fill your Toon entities; check them in the visual editor.

## Example (Toon)

Entity ids differ per installation, so check yours under Settings → Devices → Toon.

```yaml
type: custom:heating-card
name: Verwarming
entity: climate.toon_thermostat
program: switch.toon_thermostat_program
holiday: switch.toon_holiday_mode
program_override: binary_sensor.toon_thermostat_program_override
temperature: sensor.toon_temperature
humidity: sensor.toon_humidity
modulation: sensor.toon_modulation_level
burner: binary_sensor.toon_burner
heating: binary_sensor.toon_heating
hot_water: binary_sensor.toon_hot_tap_water
preheating: binary_sensor.toon_preheating
opentherm: binary_sensor.toon_opentherm_connection
boiler_status: binary_sensor.toon_boiler_status
```

## Options

| Option | Description |
|---|---|
| `entity` | Thermostat (`climate.*`) |
| `program`, `holiday` | Switches shown as toggles in the controls panel |
| `program_override` | Binary sensor; shows "Tijdelijk aangepast" next to Programma |
| `temperature`, `humidity`, `modulation` | Sensors shown as tiles (fallback: the climate entity's own values) |
| `burner`, `heating`, `hot_water`, `preheating` | Binary sensors: status lights and animation |
| `opentherm`, `boiler_status` | Problem sensors: red light and alert line. `device_class: problem` → `on` = problem; `connectivity` → `off` = problem |
| `buttons` | List of `{preset, name, icon, color, script}` or a custom `action`, same format as aircon-card. Default: the thermostat's presets |
| `columns`, `show_target`, `show_indicators`, `hide_buttons` | Layout |
| `tiles` | Extra tiles, as in aircon-card |
| `tap_action` | Action when tapping the illustration (default: more-info) |

Everything except `tiles` and custom actions can be set in the visual editor.
