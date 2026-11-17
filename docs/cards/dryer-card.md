# dryer-card

![dryer-card](../images/dryer.gif)

Animated tumble-dryer card for Home Assistant, in the same style as the other cards. Works with **Home Connect** (Bosch, Siemens, Neff…), **Miele**, LG, Samsung and other integrations through their *operation state* sensor, or with nothing more than a **smart plug** that measures power.

What it shows:
- **Illustration.** A tumble dryer. While drying, the drum turns, the laundry tumbles with a sock falling now and then, the drum glows warm and warm air rises; during cooling the glow turns blue. The water-tank window fills while running. The porthole door swings open when the door is open. The display shows the time left, "End" when finished or "Err" on a fault; the power LED blinks while paused or on a fault.
- **Status line.** Uit / Gereed / Uitgestelde start / Bezig / Gepauzeerd / Actie vereist / Klaar / Storing, plus the program, the phase and the time left ("nog 1 u 12 min"). "Deur open" is added when the door is open and nothing is running.
- **Warnings.** "Condensbak legen" and "Pluizenfilter reinigen" in red under the status.
- **Tiles.** "Klaar om" (finish time) while running, drying level, power and energy. Unknown values are hidden.
- **Buttons.** Aan/uit, Start, Pauze (becomes **Hervatten** while paused) and Stop; only the ones you configure appear. Buttons that can't be used right now are dimmed instead of hidden, so the layout doesn't jump.
- **Controls.** While idle: a program picker (when the program is a `select`). While running: a progress bar with the phase and percentage.

## Install

With HACS this card is part of **HA Animated Appliance Cards**. By hand: copy `dryer-card.js` to `/config/www/`, add `/local/dryer-card.js?v=1` as a *JavaScript module* resource and hard-refresh. Then **Add card → "Dryer card"**; the card pre-fills the entities it can find, check them in the visual editor.

## Example (Home Connect)

Entity ids differ per installation and integration version; check yours under Settings → Devices.

```yaml
type: custom:dryer-card
state_entity: sensor.droger_operation_state
power_switch: switch.droger_power
program: select.droger_selected_program
remaining: sensor.droger_program_finish_time
progress: sensor.droger_program_progress
door: binary_sensor.droger_door
start: select.droger_active_program    # selecting the chosen program here starts it
pause: button.droger_pause_program
resume: button.droger_resume_program
stop: button.droger_stop_program
drying_target: select.droger_drying_target
water_tank: binary_sensor.droger_water_tank_full
```

## Example (smart plug only)

```yaml
type: custom:dryer-card
power: sensor.droger_plug_power
power_threshold: 5    # watts; above this the appliance counts as running
```

## Options

| Option | Description |
|---|---|
| `state_entity` | Operation state (`sensor`, `select` or `binary_sensor`). Home Connect, Miele and most others are recognised; see `state_map` |
| `power_switch` | Switch for the Aan/uit button; when it's off the card shows "Uit" |
| `program`, `phase` | Program (`select` → picker in the card, or `sensor`) and program phase |
| `remaining` | Time left: a timestamp sensor (finish time, Home Connect), a duration in min/h/s (Miele) or `h:mm` |
| `progress` | Progress in %. Without it, the card estimates progress from the remaining time |
| `door` | `binary_sensor` (on = open) or a sensor reporting open/closed |
| `start`, `pause`, `resume`, `stop` | A `button`, `script`, `scene`, `switch` or `automation` (pressed according to its domain), a `select` (selects the current program: Home Connect's *active program*), or a full HA action object (YAML) |
| `power`, `power_threshold`, `energy` | Power sensor (tile, and the running state when there's no `state_entity`; default threshold 5 W) and energy sensor |
| `drying_target` | Tile for the drying level (`select` or `sensor`) |
| `water_tank`, `lint_filter` | Sensors that report a full water tank / dirty filter |
| `show_finish`, `show_power`, `show_program_select`, `hide_buttons` | Layout |
| `state_map` | YAML only: map your integration's raw states to `off`, `idle`, `delayed`, `running`, `paused`, `action`, `finished` or `error`, e.g. `state_map: { "Bezig": running }` |
| `tiles` | YAML only: extra tiles, as in aircon-card |
| `tap_action` | Action when tapping the illustration (default: more-info) |

Everything except `state_map`, `tiles` and custom actions can be set in the visual editor. Progress without a sensor is remembered per browser (localStorage).
