# aircon-card

Animated air-conditioner card for Home Assistant. Works with a `climate` entity, with IR/RF scripts (one per mode), or both.
The illustration and animation style come from [skyrotter/ha-appliance-electromenager-cards](https://github.com/skyrotter/ha-appliance-electromenager-cards) (MIT).

## Install

1. Copy `aircon-card.js` to `/config/www/aircon-card.js`.
2. **Settings → Dashboards → ⋮ → Resources → Add resource**
   URL: `/local/aircon-card.js?v=1`, type: **JavaScript module**.
3. Hard-refresh the browser (bump `?v=` after every update of the file).

## Visual editor

Add the card via **Edit dashboard → Add card → search "Aircon card"**. Everything below can be set in the visual editor:
device and mode helper, the buttons, the airflow / silent entities (add / remove / reorder, mode, label, icon, script, colour), sensors and layout.
YAML-only extras (`state_map`, `tiles`, buttons with a custom `action`) are kept untouched when you edit visually.

## Your setup: three scripts (cool / heat / off)

IR scripts can't report what the AC is doing, so the card needs to know the mode some other way. Best option: an
`input_select` helper (e.g. `input_select.airco_modus` with options `Koelen`, `Verwarmen`, `Uit`).
The card sets that helper itself when you press a button, so you don't need to change your scripts.

```yaml
type: custom:aircon-card
name: Woonkamer airco
state_entity: input_select.airco_modus
temperature: sensor.woonkamer_temperatuur
humidity: sensor.woonkamer_luchtvochtigheid
outdoor_temperature: sensor.buiten_temperatuur   # optional
power: sensor.airco_vermogen                     # optional, smart plug / energy meter
power_threshold: 30                              # W; below this while on = "at target"
buttons:
  - mode: cool
    script: script.airco_koelen
  - mode: heat
    script: script.airco_verwarmen
  - mode: off
    script: script.airco_uit
```

Without `state_entity` the card remembers the last pressed button in the browser (works, but each device keeps its own memory).
With a `power` sensor the card also knows when the compressor is idle ("Op temperatuur").

## With a climate entity

```yaml
type: custom:aircon-card
entity: climate.slaapkamer
```

Buttons are generated from the entity's `hvac_modes`, and a target-temperature stepper appears.

## Extra controls: airflow and silent mode

While the AC is on, a panel below the buttons shows the target temperature plus:

| Row | Config key | Entity types | Fallback when empty (climate entity) |
|---|---|---|---|
| Luchtstroom horizontaal | `airflow_horizontal` | `select`, `input_select` | `swing_horizontal_modes` → `climate.set_swing_horizontal_mode` |
| Luchtstroom verticaal | `airflow_vertical` | `select`, `input_select` | `swing_modes` → `climate.set_swing_mode` |
| Stille modus | `silent` | `switch`, `input_boolean` | a `quiet`/`silent` preset or fan mode; off restores the previous one |

A row only appears if it has a source. Set a key to `false` in YAML to hide an auto-detected row.
Dropdown values use your integration's own translations when it has them; otherwise common values (auto, swing, left, high…) are translated to Dutch by the card.
With IR scripts, point these at helpers (`input_select` / `input_boolean`) and let an automation send the IR command when the helper changes.

```yaml
airflow_horizontal: select.woonkamer_airco_horizontal_swing
airflow_vertical: select.woonkamer_airco_vertical_swing
silent: switch.woonkamer_airco_quiet
```

## Options

| Option | Description |
|---|---|
| `entity` | `climate.*` entity (or a switch/input_boolean for on/off only) |
| `state_entity` | Helper/sensor holding the current mode. Recognises cool/koelen, heat/verwarmen, off/uit, dry/drogen, fan/ventilator, auto |
| `state_map` | Map custom states → modes, e.g. `{ "Zomer": cool, "Winter": heat }` |
| `set_state_entity` | `false` to stop the card writing the `input_select` (if your scripts already do it) |
| `temperature`, `humidity`, `outdoor_temperature`, `power` | Sensors shown as tiles |
| `power_threshold` | Watts below which a running AC counts as "at target" (default 30) |
| `tiles` | Extra tiles: list of entity ids or `{entity, name, icon, decimals}` |
| `buttons` | List of buttons (see below) |
| `columns` | Buttons per row (default: number of buttons, max 5) |
| `airflow_horizontal`, `airflow_vertical`, `silent` | Extra controls, see above |
| `show_target` | `false` hides the target-temperature stepper |
| `tap_action` | Action when tapping the illustration (default: more-info) |
| `hide_buttons` | `true` to show only illustration + tiles |

### Buttons

Each button: `mode` (cool, heat, dry, fan_only, auto, off — sets the colour, icon and default label), plus one way to act:

```yaml
buttons:
  - mode: cool
    script: script.airco_koelen                 # runs script.turn_on
  - mode: heat
    name: Warm 22°
    icon: mdi:radiator
    action: perform-action                      # any HA action
    perform_action: script.airco_verwarmen
    data: { temperature: 22 }
  - name: Turbo                                  # button without a mode: never highlighted
    icon: mdi:weather-windy
    color: "#e040fb"
    action: script.airco_turbo
```

With a climate `entity` and no `script`/`action`, the button calls `climate.set_hvac_mode`.

## Theming

Colours follow HA's climate colours (`--state-climate-cool-color`, `--state-climate-heat-color`, …), so card-mod or your theme can override them. Size of the drawing: `--aircon-illustration-size` (default 116px). Labels follow your HA language (Dutch and English built in).
