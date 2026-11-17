/*
 * aircon-card — animated air-conditioner card for Home Assistant
 *
 * Works with a climate entity, with IR/RF scripts (one per mode), or both.
 * Illustration adapted from skyrotter/ha-appliance-electromenager-cards (MIT, © 2026 Nicolas).
 */
const CARD_VERSION = "1.3.0";

const MODES = {
  cool: { icon: "mdi:snowflake", color: "#4fc3f7", lcd: "COOL" },
  heat: { icon: "mdi:fire", color: "#ff8a3d", lcd: "HEAT" },
  dry: { icon: "mdi:water-percent", color: "#7fd6c0", lcd: "DRY" },
  fan_only: { icon: "mdi:fan", color: "#cfd6dd", lcd: "FAN" },
  auto: { icon: "mdi:thermostat-auto", color: "#b39ddb", lcd: "AUTO" },
  heat_cool: { icon: "mdi:sun-snowflake-variant", color: "#b39ddb", lcd: "AUTO" },
  off: { icon: "mdi:power", color: "#9aa3ad", lcd: "" },
};

const TXT = {
  en: {
    cool: "Cool", heat: "Heat", dry: "Dry", fan_only: "Fan", auto: "Auto", heat_cool: "Heat/Cool", off: "Off",
    s_cool: "Cooling", s_heat: "Heating", s_dry: "Drying", s_fan: "Ventilating", s_auto: "Auto",
    s_idle: "At target", s_off: "Off", s_unavailable: "Unavailable", s_on: "Running",
    room: "Room", humidity: "Humidity", power: "Power", outdoor: "Outside", target: "Target", sending: "Sending…",
    airflow_h: "Airflow horizontal", airflow_v: "Airflow vertical", silent: "Silent mode",
  },
  nl: {
    cool: "Koelen", heat: "Verwarmen", dry: "Drogen", fan_only: "Ventilator", auto: "Auto", heat_cool: "Verw./Koelen", off: "Uit",
    s_cool: "Aan het koelen", s_heat: "Aan het verwarmen", s_dry: "Aan het drogen", s_fan: "Ventileert", s_auto: "Automatisch",
    s_idle: "Op temperatuur", s_off: "Uit", s_unavailable: "Niet beschikbaar", s_on: "Draait",
    room: "Kamer", humidity: "Vochtigheid", power: "Vermogen", outdoor: "Buiten", target: "Doel", sending: "Versturen…",
    airflow_h: "Luchtstroom horizontaal", airflow_v: "Luchtstroom verticaal", silent: "Stille modus",
  },
};

// swing / airflow values → Dutch (used when the integration has no translation of its own)
const VAL_NL = {
  off: "Uit", on: "Aan", auto: "Auto", swing: "Zwenken", both: "Beide", vertical: "Verticaal", horizontal: "Horizontaal",
  stop: "Vast", stopped: "Vast", fixed: "Vast", left: "Links", right: "Rechts", center: "Midden", centre: "Midden", middle: "Midden",
  up: "Omhoog", down: "Omlaag", top: "Boven", bottom: "Onder", highest: "Hoogst", high: "Hoog", mid_high: "Midden-hoog",
  middle_high: "Midden-hoog", mid: "Midden", mid_low: "Midden-laag", middle_low: "Midden-laag", low: "Laag", lowest: "Laagst",
  wide: "Breed", full: "Volledig", left_right: "Links-rechts", leftright: "Links-rechts", updown: "Op-neer", up_down: "Op-neer",
  "1_left": "Links", "5_right": "Rechts",
};
const QUIET = ["quiet", "silent", "silence", "whisper", "stil", "stille"];
const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));

// words a helper (input_select / input_text / sensor) may contain → mode
const SYNONYMS = {
  cool: ["cool", "cooling", "koelen", "koel", "koeling", "cold"],
  heat: ["heat", "heating", "verwarmen", "verwarming", "warm", "heizen"],
  dry: ["dry", "drying", "drogen", "ontvochtigen", "dehumidify"],
  fan_only: ["fan", "fan_only", "ventilator", "ventileren", "ventilate"],
  auto: ["auto", "automatisch"],
  heat_cool: ["heat_cool"],
  off: ["off", "uit", "idle", "standby", "stand-by", "none", "false"],
};
const toMode = (v) => {
  const s = String(v ?? "").trim().toLowerCase();
  return Object.keys(SYNONYMS).find((k) => SYNONYMS[k].includes(s)) || null;
};
const BAD = ["unavailable", "unknown", "none", ""];

const SVG_AC = `
<defs>
<radialGradient id="ID-heat" cx=".5" cy=".3" r=".6"><stop offset="0" stop-color="#ff9a4a" stop-opacity=".45"/><stop offset=".6" stop-color="#ff7a2e" stop-opacity=".15"/><stop offset="1" stop-color="#ff7a2e" stop-opacity="0"/></radialGradient>
<radialGradient id="ID-cold" cx=".5" cy=".3" r=".6"><stop offset="0" stop-color="#7fd3ff" stop-opacity=".35"/><stop offset=".6" stop-color="#4fc3f7" stop-opacity=".12"/><stop offset="1" stop-color="#4fc3f7" stop-opacity="0"/></radialGradient>
<linearGradient id="ID-split" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#eef1f4"/><stop offset="1" stop-color="#cfd5db"/></linearGradient>
<radialGradient id="ID-shadow"><stop offset="0" stop-color="#000" stop-opacity=".3"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
</defs>
<ellipse cx="60" cy="84" rx="52" ry="3" fill="url(#ID-shadow)" opacity=".5"/>
<ellipse class="ac-warm" cx="60" cy="100" rx="54" ry="32" fill="url(#ID-heat)"/>
<ellipse class="ac-chill" cx="60" cy="100" rx="54" ry="32" fill="url(#ID-cold)"/>
<g class="ac-waves"><path d="M30 124q4-4 0-8t0-8"/><path d="M60 128q4-4 0-8t0-8"/><path d="M90 124q4-4 0-8t0-8"/></g>
<g class="ac-air">
  <path d="M22 84q-6 14 0 26t-2 22"/><path d="M40 84q-4 14 2 26t0 22"/><path d="M60 84q-3 14 3 26t-1 22"/>
  <path d="M80 84q-2 14 4 26t0 22"/><path d="M98 84q0 14 6 26t2 22"/>
</g>
<g class="ac-flakes" stroke="#bfe9ff" stroke-width=".8" stroke-linecap="round">
  <path d="M30 92v5M27.8 93.3l4.4 2.5M27.8 95.8l4.4-2.5"/>
  <path d="M52 94v5M49.8 95.3l4.4 2.5M49.8 97.8l4.4-2.5"/>
  <path d="M72 92v5M69.8 93.3l4.4 2.5M69.8 95.8l4.4-2.5"/>
  <path d="M92 95v5M89.8 96.3l4.4 2.5M89.8 98.8l4.4-2.5"/>
</g>
<g class="ac-drops"><circle cx="34" cy="90" r="1.3"/><circle cx="56" cy="92" r="1.3"/><circle cx="76" cy="90" r="1.3"/><circle cx="92" cy="93" r="1.3"/></g>
<path d="M6 54q0-10 10-10h88q10 0 10 10v18q0 6-6 8h-96q-6-2-6-8z" fill="url(#ID-split)" stroke="#aab2ba" stroke-width=".7"/>
<path d="M14 48h92" stroke="#c4cbd2" stroke-width=".6"/>
<path d="M16 51h88M16 53.5h88" stroke="#d7dce1" stroke-width=".5"/>
<path d="M10 70h100" stroke="#fff" stroke-opacity=".9" stroke-width="1"/>
<rect class="ac-slot" x="12" y="73.5" width="96" height="5" rx="2.5" fill="#2a2f35"/>
<g class="ac-flap"><path d="M12 74.5h96q0 4.5-4 5h-88q-4-.5-4-5z" fill="#f2f4f6" stroke="#aab2ba" stroke-width=".5"/></g>
<rect x="76" y="56" width="34" height="14" rx="2.5" fill="#0c1720" opacity=".92"/>
<text class="lcd" x="95" y="63.4" text-anchor="middle"></text>
<g class="ac-ico ico-cool" transform="translate(-9 3)" stroke="#4fc3f7" stroke-width=".9" stroke-linecap="round"><path d="M78 59v8M74.5 61l7 4M74.5 65l7-4"/></g>
<g class="ac-ico ico-heat" transform="translate(-9 3)"><circle cx="78" cy="63" r="2" fill="#ff8a3d"/><path d="M78 58.6v1.2M78 66.2v1.2M73.6 63h1.2M81.2 63h1.2M74.9 59.9l.8.8M80.3 65.3l.8.8M74.9 66.1l.8-.8M80.3 60.7l.8-.8" stroke="#ff8a3d" stroke-width=".8" stroke-linecap="round"/></g>
<g class="ac-ico ico-dry" transform="translate(-9 3)"><path d="M78 59q-3 4-3 5.6a3 3 0 0 0 6 0q0-1.6-3-5.6z" fill="#7fd6c0"/></g>
<g class="ac-ico ico-fan" transform="translate(-9 3)" stroke="#cfd6dd" stroke-width="1" stroke-linecap="round" fill="none"><path d="M78 63q-3-4 0-4.5M78 63q4-1 3.5 2.4M78 63q-1 4-4 2"/></g>
<g class="ac-ico ico-auto" transform="translate(-9 3)"><circle cx="78" cy="63" r="3" fill="none" stroke="#b39ddb" stroke-width=".9"/><path d="M76.6 64.4l1.4-3.2 1.4 3.2" fill="none" stroke="#b39ddb" stroke-width=".8"/></g>
<circle class="led" cx="18" cy="64" r="1.1"/>`;

const STYLE = `
:host {
  --ac-cool: var(--state-climate-cool-color, #4fc3f7);
  --ac-heat: var(--state-climate-heat-color, #ff8a3d);
  --ac-dry: var(--state-climate-dry-color, #7fd6c0);
  --ac-fan: var(--state-climate-fan_only-color, #9fb3c4);
  --ac-auto: var(--state-climate-auto-color, #b39ddb);
  --ac-off: var(--disabled-text-color, #9aa3ad);
  display: block; height: 100%;
}
:host([paused]) *, :host([paused]) *::before, :host([paused]) *::after { animation-play-state: paused !important; }
ha-card { height: 100%; overflow: hidden; container-type: inline-size; position: relative; }
ha-card::before {
  content: ""; position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 1s, background 1s;
  background: radial-gradient(120% 90% at 0% 0%, color-mix(in srgb, var(--c) 18%, transparent), transparent 60%);
}
ha-card.on::before { opacity: 1; }
.wrap { --c: var(--ac-off); padding: 14px; display: flex; flex-direction: column; gap: 12px; position: relative; }
.wrap.s-cool { --c: var(--ac-cool); } .wrap.s-heat { --c: var(--ac-heat); } .wrap.s-dry { --c: var(--ac-dry); }
.wrap.s-fan { --c: var(--ac-fan); } .wrap.s-auto { --c: var(--ac-auto); }
.wrap.s-idle.m-cool { --c: var(--ac-cool); } .wrap.s-idle.m-heat { --c: var(--ac-heat); }
.wrap.s-idle.m-dry { --c: var(--ac-dry); } .wrap.s-idle.m-fan_only { --c: var(--ac-fan); }
.wrap.s-idle.m-auto, .wrap.s-idle.m-heat_cool { --c: var(--ac-auto); }
.top { display: grid; grid-template-columns: auto minmax(0,1fr); column-gap: 14px; row-gap: 10px; align-items: start; }
.illus {
  width: var(--aircon-illustration-size, 116px); aspect-ratio: 120/140; border-radius: 16px; padding: 4px; box-sizing: content-box; cursor: pointer;
  grid-row: span 2;
  background: radial-gradient(circle at 50% 40%, rgba(127,127,127,.10), rgba(127,127,127,.03) 70%);
  transition: box-shadow .8s;
}
.on .illus { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 25%, transparent); }
svg { width: 100%; height: 100%; display: block; overflow: visible; }
.head { display: flex; flex-direction: column; gap: 3px; min-width: 0; cursor: pointer; }
.name { font-size: 16px; font-weight: 600; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.status { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--secondary-text-color); min-width: 0; }
.status .txt { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.on .status { color: var(--primary-text-color); }
.dot { width: 8px; height: 8px; border-radius: 50%; flex: none; background: var(--c); transition: background .4s; }
.dot { position: relative; }
.on .dot { box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 25%, transparent); }
.on .dot::after { content: ""; position: absolute; inset: 0; border-radius: 50%; background: var(--c); animation: pulse 2.4s ease-out infinite; }
.s-idle .dot::after { display: none; }
.stats { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 6px; }
.stats:empty { display: none; }
.tile { display: flex; flex-direction: column; padding: 6px 9px; border-radius: 10px; min-width: 0; background: rgba(127,127,127,.09); cursor: pointer; }
.tile:hover { background: rgba(127,127,127,.16); }
.val { font-size: 14px; font-weight: 600; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lbl { display: flex; align-items: center; gap: 3px; font-size: 11px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lbl ha-icon { --mdc-icon-size: 13px; flex: none; }

.modes { display: grid; grid-template-columns: repeat(var(--n, 3), minmax(0,1fr)); gap: 8px; }
.mode {
  --mc: var(--ac-off);
  position: relative; overflow: hidden; border: none; border-radius: 12px; padding: 9px 4px 8px; cursor: pointer; font: inherit;
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  color: var(--secondary-text-color); background: rgba(127,127,127,.10);
  transition: background .3s, color .3s, transform .15s, box-shadow .3s;
}
.mode[data-mode=cool] { --mc: var(--ac-cool); } .mode[data-mode=heat] { --mc: var(--ac-heat); }
.mode[data-mode=dry] { --mc: var(--ac-dry); } .mode[data-mode=fan_only] { --mc: var(--ac-fan); }
.mode[data-mode=auto], .mode[data-mode=heat_cool] { --mc: var(--ac-auto); }
.mode ha-icon { --mdc-icon-size: 22px; color: var(--mc); transition: color .3s, transform .4s; }
.mode .ml { font-size: 12px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.mode:hover { background: rgba(127,127,127,.17); }
.mode:active { transform: scale(.96); }
.mode:focus-visible { outline: 2px solid var(--mc); outline-offset: 2px; }
.mode { --mt: #fff; }
.mode[data-mode=cool], .mode[data-mode=dry], .mode[data-mode=fan_only] { --mt: #0d2230; }
.mode.active { color: var(--mt); background: var(--mc); box-shadow: 0 4px 14px -4px color-mix(in srgb, var(--mc) 70%, transparent); }
.mode.active ha-icon { color: var(--mt); }
.mode.active[data-mode=off] { color: var(--primary-text-color); background: rgba(127,127,127,.28); box-shadow: none; }
.mode.active[data-mode=off] ha-icon { color: var(--primary-text-color); }
.mode.active[data-mode=cool] ha-icon { animation: spin 8s linear infinite; }
.mode.active[data-mode=fan_only] ha-icon { animation: spin 1.6s linear infinite; }
.mode.active[data-mode=heat] ha-icon { animation: flicker 1.4s ease-in-out infinite; }
.mode.busy::after {
  content: ""; position: absolute; inset: 0; border-radius: inherit;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent); animation: sweep .9s linear infinite;
}
.mode .ripple { position: absolute; border-radius: 50%; transform: scale(0); background: color-mix(in srgb, var(--mc) 45%, transparent); animation: ripple .6s ease-out forwards; pointer-events: none; }

.controls { display: grid; grid-template-rows: 1fr; transition: grid-template-rows .45s ease, opacity .35s ease, margin .45s ease; }
.controls.closed { grid-template-rows: 0fr; opacity: 0; margin-top: -12px; pointer-events: none; }
.cin { overflow: hidden; min-height: 0; border-radius: 12px; background: rgba(127,127,127,.09); }
.crow { display: flex; align-items: center; gap: 10px; padding: 6px 6px 6px 12px; min-height: 46px; box-sizing: border-box; }
.crow[hidden] { display: none; }
.crow:not([hidden]) ~ .crow:not([hidden]) { border-top: 1px solid rgba(127,127,127,.14); }
.crow > ha-icon { --mdc-icon-size: 18px; color: var(--c); flex: none; transition: color .4s; }
.tl { flex: 1; min-width: 0; font-size: 13px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sel { position: relative; display: flex; align-items: center; max-width: 55%; }
.sel select {
  appearance: none; -webkit-appearance: none; font: inherit; font-size: 13px; font-weight: 500; max-width: 100%;
  color: var(--primary-text-color); background: rgba(127,127,127,.18); border: none; border-radius: 16px;
  padding: 7px 30px 7px 12px; cursor: pointer; text-overflow: ellipsis; transition: background .2s, color .2s;
}
.sel select:hover { background: color-mix(in srgb, var(--c) 30%, transparent); }
.sel select:focus-visible { outline: 2px solid var(--c); outline-offset: 1px; }
.sel option { background: var(--card-background-color, #fff); color: var(--primary-text-color); }
.sel ha-icon { position: absolute; right: 9px; pointer-events: none; --mdc-icon-size: 16px; color: var(--secondary-text-color); }
.crow.pending select { color: var(--c); }
.crow.toggle { cursor: pointer; }
.sw { position: relative; width: 42px; height: 24px; margin-right: 4px; padding: 0; border-radius: 12px; border: none; cursor: pointer; flex: none; background: rgba(127,127,127,.35); transition: background .25s; }
.sw span { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.3); transition: transform .3s cubic-bezier(.3,1.4,.5,1); }
.sw[aria-checked=true] { background: var(--c); }
.sw[aria-checked=true] span { transform: translateX(18px); }
.sw:focus-visible { outline: 2px solid var(--c); outline-offset: 2px; }
.quiet .ac-air path { animation-duration: 2.6s !important; opacity: .4 !important; }
.quiet .ac-flap { animation-duration: 10s !important; }
.target .tv { font-size: 16px; font-weight: 600; min-width: 52px; text-align: center; color: var(--primary-text-color); font-variant-numeric: tabular-nums; }
.target button { width: 32px; height: 32px; border-radius: 50%; border: none; cursor: pointer; display: grid; place-items: center; color: var(--primary-text-color); background: rgba(127,127,127,.18); }
.target button:hover { background: color-mix(in srgb, var(--c) 35%, transparent); }
.target button ha-icon { --mdc-icon-size: 18px; }
.target.pending .tv { color: var(--c); }

/* ---- illustration states ---- */
.lcd { font: 700 10px ui-monospace, "Courier New", monospace; dominant-baseline: central; fill: transparent; transition: fill .4s; }
.on .lcd { fill: var(--c); }
.led { fill: #5a636d; transition: fill .3s; } .on .led { fill: #3ddc84; }
.ac-flap { transform-box: view-box; transform-origin: 60px 74px; transition: transform .9s cubic-bezier(.3,1.3,.5,1); }
.ac-slot { opacity: 0; transition: opacity .6s; }
.on .ac-flap { transform: translateY(4.5px) scaleY(.75); } .on .ac-slot { opacity: 1; }
.s-cool .ac-flap, .s-heat .ac-flap, .s-auto .ac-flap { animation: swing 6s ease-in-out infinite; }
.ac-air path { fill: none; stroke: var(--c); stroke-width: 2; stroke-linecap: round; stroke-dasharray: 5 7; opacity: 0; transition: opacity .8s; }
.s-cool .ac-air path, .s-heat .ac-air path, .s-fan .ac-air path, .s-auto .ac-air path { opacity: .75; animation: blow 1s linear infinite; }
.s-dry .ac-air path, .s-idle .ac-air path { opacity: .3; animation: blow 2.6s linear infinite; }
.ac-air path:nth-child(2) { animation-delay: -.3s; } .ac-air path:nth-child(3) { animation-delay: -.6s; }
.ac-air path:nth-child(4) { animation-delay: -.15s; } .ac-air path:nth-child(5) { animation-delay: -.45s; }
.ac-flakes path, .ac-drops circle, .ac-waves path { opacity: 0; transform-box: fill-box; transform-origin: center; }
.s-cool .ac-flakes path { animation: snow 2.8s ease-in infinite; }
.ac-flakes path:nth-child(2) { animation-delay: .7s; } .ac-flakes path:nth-child(3) { animation-delay: 1.4s; } .ac-flakes path:nth-child(4) { animation-delay: 2.1s; }
.ac-drops circle { fill: #7fd6c0; }
.s-dry .ac-drops circle { animation: fall 1.6s ease-in infinite; }
.ac-drops circle:nth-child(2) { animation-delay: .4s; } .ac-drops circle:nth-child(3) { animation-delay: .8s; } .ac-drops circle:nth-child(4) { animation-delay: 1.2s; }
.ac-waves path { fill: none; stroke: #ffb37a; stroke-width: 1.6; stroke-linecap: round; }
.s-heat .ac-waves path { animation: steam 2.6s ease-out infinite; }
.ac-waves path:nth-child(2) { animation-delay: .8s; } .ac-waves path:nth-child(3) { animation-delay: 1.6s; }
.ac-warm, .ac-chill { opacity: 0; transition: opacity 1.2s; }
.s-heat .ac-warm { opacity: 1; animation: glow 3s ease-in-out infinite; }
.s-cool .ac-chill { opacity: 1; animation: glow 3.4s ease-in-out infinite; }
.ac-ico { opacity: 0; transition: opacity .4s; }
.m-cool .ico-cool, .m-heat .ico-heat, .m-dry .ico-dry, .m-fan_only .ico-fan, .m-auto .ico-auto, .m-heat_cool .ico-auto { opacity: 1; }
.s-off .ac-ico, .s-unavailable .ac-ico { opacity: 0 !important; }
.s-unavailable .illus { opacity: .5; filter: grayscale(1); }

@keyframes blow { to { stroke-dashoffset: -24; } }
@keyframes swing { 0%,100% { transform: translateY(4.5px) scaleY(.75); } 50% { transform: translateY(5.5px) scaleY(.55); } }
@keyframes glow { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
@keyframes fall { 0% { opacity: 0; transform: translateY(0); } 25% { opacity: .9; } 100% { opacity: 0; transform: translateY(16px); } }
@keyframes snow { 0% { opacity: 0; transform: translateY(0) rotate(0); } 20% { opacity: .9; } 100% { opacity: 0; transform: translateY(30px) rotate(120deg); } }
@keyframes steam { 0% { opacity: 0; transform: translateY(4px); } 30% { opacity: .55; } 100% { opacity: 0; transform: translateY(-8px); } }
@keyframes pulse { 0% { transform: scale(1); opacity: .55; } 100% { transform: scale(2.8); opacity: 0; } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes flicker { 0%,100% { transform: scale(1); } 50% { transform: scale(1.12) translateY(-1px); } }
@keyframes sweep { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
@keyframes ripple { to { transform: scale(2.6); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; } }

@container (max-width: 460px) { .modes[style*="--n:5"] .ml, .modes[style*="--n:6"] .ml { font-size: 11px; } }
@container (max-width: 340px) {
  .illus { width: var(--aircon-illustration-size-small, 84px); grid-row: auto; }
  .stats { grid-column: 1 / -1; }
  .mode .ml { font-size: 11px; }
}
`;

class AirconCard extends HTMLElement {
  static async getConfigElement() {
    // make sure HA's form + pickers are loaded (they're lazy-loaded in the frontend)
    if (!customElements.get("ha-form") || !customElements.get("ha-entity-picker")) {
      try {
        const helpers = await window.loadCardHelpers?.();
        const tile = await helpers?.createCardElement({ type: "tile", entity: "sun.sun" });
        await tile?.constructor?.getConfigElement?.();
      } catch (e) { /* ignore */ }
    }
    return document.createElement("aircon-card-editor");
  }

  static getStubConfig(hass) {
    const climate = hass && Object.keys(hass.states).find((e) => e.startsWith("climate."));
    return climate ? { entity: climate } : { name: "Airco", buttons: [{ mode: "cool" }, { mode: "heat" }, { mode: "off" }] };
  }

  setConfig(config) {
    if (!config) throw new Error("Invalid configuration");
    this._config = { power_threshold: 30, step: null, ...config };
    this._key = `aircon-card:${config.storage_key || config.name || config.entity || "default"}`;
    this._built = false;
    this._ids = null;
    this._pend = {};
    if (this._hass) this._render();
  }

  set hass(hass) {
    const old = this._hass;
    this._hass = hass;
    if (!this._config) return;
    // Home Assistant pushes every state change in the house to every card: only redraw when one of ours changed
    if (old && this._built && !this._changed(old, hass)) return;
    this._render();
  }
  _changed(old, hass) {
    if (old.locale?.language !== hass.locale?.language || old.themes !== hass.themes) return true;
    if (!this._ids) {
      const ids = new Set();
      const walk = (v) => {
        if (typeof v === "string") { if (/^[a-z_]+\.[a-z0-9_]+$/.test(v)) ids.add(v); }
        else if (v && typeof v === "object") Object.values(v).forEach(walk);
      };
      walk(this._config);
      this._ids = [...ids];
    }
    return this._ids.some((id) => old.states[id] !== hass.states[id]);
  }
  // pause animations while the card is scrolled out of view
  _observe() {
    if (this._io || typeof IntersectionObserver === "undefined") return;
    this._io = new IntersectionObserver((entries) => this.toggleAttribute("paused", !entries[entries.length - 1].isIntersecting));
    this._io.observe(this);
  }

  connectedCallback() { this._observe(); }
  disconnectedCallback() { this._io?.disconnect(); this._io = null; }
  getCardSize() { return 4; }
  getGridOptions() { return { columns: 12, min_columns: 6, rows: "auto" }; }

  // ---------- helpers ----------
  _t(k) {
    const lang = String(this._hass?.locale?.language || this._hass?.language || "en").slice(0, 2);
    return (TXT[lang] || TXT.en)[k] ?? TXT.en[k] ?? k;
  }
  _st(id) { return id ? this._hass.states[id] : undefined; }
  _num(id) {
    const s = this._st(id);
    if (!s || BAD.includes(String(s.state).toLowerCase())) return null;
    const n = Number(s.state);
    return Number.isFinite(n) ? n : null;
  }
  _fmt(v, unit, dec = 1) {
    if (v == null) return "—";
    const n = Number(v).toLocaleString(this._hass?.locale?.language || undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
    return `${n}${unit ? (unit === "%" || unit.startsWith("°") ? "" : " ") + unit : ""}`;
  }
  _unit(id, fb) { return this._st(id)?.attributes?.unit_of_measurement || fb; }
  _buttons() {
    const c = this._config;
    if (Array.isArray(c.buttons) && c.buttons.length) return c.buttons.map((b) => (typeof b === "string" ? { mode: b } : b));
    const clim = this._st(c.entity);
    const modes = clim?.attributes?.hvac_modes || ["cool", "heat", "off"];
    const order = ["cool", "heat", "heat_cool", "auto", "dry", "fan_only", "off"];
    return order.filter((m) => modes.includes(m)).map((mode) => ({ mode }));
  }
  _memory() { try { return localStorage.getItem(this._key); } catch (e) { return null; } }
  _remember(mode) { try { localStorage.setItem(this._key, mode); } catch (e) { /* ignore */ } }

  // ---------- state ----------
  _resolve() {
    const c = this._config;
    const clim = c.entity && this._st(c.entity);
    const isClim = clim && c.entity.startsWith("climate.");
    let mode = null, action = null, unavailable = false;

    if (c.state_entity) {
      const s = this._st(c.state_entity);
      const raw = s ? s.state : null;
      const mapped = c.state_map && raw != null ? c.state_map[raw] : null;
      mode = mapped || toMode(raw);
      if (!mode && s && s.state === "on") mode = "on";
    } else if (isClim) {
      const st = String(clim.state).toLowerCase();
      if (BAD.includes(st)) unavailable = true;
      else mode = st;
      action = String(clim.attributes.hvac_action || "").toLowerCase() || null;
    } else if (clim) {
      // a switch / input_boolean as main entity: on/off only, mode from memory
      const st = String(clim.state).toLowerCase();
      if (BAD.includes(st)) unavailable = true;
      else mode = st === "off" ? "off" : toMode(this._memory()) || "on";
    } else {
      mode = toMode(this._memory()) || null;
    }
    if (this._pendingMode && Date.now() - this._pendingAt < 8000 && !isClim && !c.state_entity) mode = this._pendingMode;

    const watts = this._num(c.power);
    let status;
    if (unavailable) status = "unavailable";
    else if (!mode) status = watts != null && watts > c.power_threshold ? "on" : "off";
    else if (mode === "off") status = "off";
    else if (action && action !== "off") {
      status = { cooling: "cool", heating: "heat", preheating: "heat", drying: "dry", fan: "fan", idle: "idle", defrosting: "heat" }[action] || null;
    }
    if (!status) status = { cool: "cool", heat: "heat", dry: "dry", fan_only: "fan", auto: "auto", heat_cool: "auto", on: "on" }[mode] || "on";
    // compressor not drawing power → at target (only for modes that need the compressor)
    if (watts != null && ["cool", "heat", "auto"].includes(status) && watts < c.power_threshold) status = "idle";
    return { mode, status, watts, clim: isClim ? clim : null };
  }

  // ---------- render ----------
  _build() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    const uid = `ac${Math.random().toString(36).slice(2, 8)}`;
    const btns = this._buttons();
    this.shadowRoot.innerHTML = `
      <style>${STYLE}</style>
      <ha-card>
        <div class="wrap" id="wrap">
          <div class="top">
            <div class="illus" id="illus"><svg viewBox="0 0 120 140" aria-hidden="true">${SVG_AC.replace(/ID-/g, `${uid}-`)}</svg></div>
            <div class="head" id="head">
              <div class="name" id="name"></div>
              <div class="status"><span class="dot"></span><span class="txt" id="status"></span></div>
            </div>
            <div class="stats" id="stats"></div>
          </div>
          <div class="modes" id="modes" style="--n:${this._config.columns || Math.min(btns.length, 5)}">
            ${btns.map((b, i) => `
              <button class="mode" data-i="${i}" data-mode="${b.mode || ""}" ${b.color ? `style="--mc:${b.color}"` : ""} title="${b.name || this._t(b.mode)}">
                <ha-icon icon="${b.icon || MODES[b.mode]?.icon || "mdi:gesture-tap"}"></ha-icon>
                <span class="ml">${b.name || this._t(b.mode) || ""}</span>
              </button>`).join("")}
          </div>
          <div class="controls closed" id="controls"><div class="cin">
            <div class="crow target" id="target" hidden>
              <ha-icon icon="mdi:thermometer"></ha-icon>
              <span class="tl">${this._t("target")}</span>
              <button id="minus" aria-label="-"><ha-icon icon="mdi:minus"></ha-icon></button>
              <span class="tv" id="tv"></span>
              <button id="plus" aria-label="+"><ha-icon icon="mdi:plus"></ha-icon></button>
            </div>
            <label class="crow" id="r-h" hidden>
              <ha-icon icon="mdi:arrow-left-right"></ha-icon><span class="tl">${this._t("airflow_h")}</span>
              <span class="sel"><select id="sel-h" aria-label="${this._t("airflow_h")}"></select><ha-icon icon="mdi:chevron-down"></ha-icon></span>
            </label>
            <label class="crow" id="r-v" hidden>
              <ha-icon icon="mdi:arrow-up-down"></ha-icon><span class="tl">${this._t("airflow_v")}</span>
              <span class="sel"><select id="sel-v" aria-label="${this._t("airflow_v")}"></select><ha-icon icon="mdi:chevron-down"></ha-icon></span>
            </label>
            <div class="crow toggle" id="r-s" hidden>
              <ha-icon icon="mdi:volume-off"></ha-icon><span class="tl">${this._t("silent")}</span>
              <button class="sw" id="sw-s" role="switch" aria-checked="false" aria-label="${this._t("silent")}"><span></span></button>
            </div>
          </div></div>
        </div>
      </ha-card>`;
    const $ = (id) => this.shadowRoot.getElementById(id);
    if (this._config.hide_buttons) $("modes").style.display = "none";
    $("modes").addEventListener("click", (ev) => {
      const el = ev.target.closest(".mode");
      if (!el) return;
      this._ripple(el, ev);
      this._press(btns[Number(el.dataset.i)], el);
    });
    const more = () => this._moreInfo(this._config.entity || this._config.state_entity || this._config.temperature || this._config.power);
    $("illus").addEventListener("click", () => (this._config.tap_action ? this._runAction(this._config.tap_action) : more()));
    $("head").addEventListener("click", more);
    $("stats").addEventListener("click", (ev) => { const t = ev.target.closest(".tile"); if (t) this._moreInfo(t.dataset.entity); });
    $("minus").addEventListener("click", () => this._nudge(-1));
    $("plus").addEventListener("click", () => this._nudge(1));
    ["h", "v"].forEach((k) => $(`sel-${k}`).addEventListener("change", (ev) => this._setCtrl(k, ev.target.value)));
    $("r-s").addEventListener("click", (ev) => {
      ev.preventDefault();
      const o = this._ctrl("s", this._resolve());
      if (o) this._setCtrl("s", !this._pv("s", o.on));
    });
    this._built = true;
  }

  _render() {
    if (!this._built) this._build();
    const c = this._config, r = this._resolve();
    const $ = (id) => this.shadowRoot.getElementById(id);
    const wrap = $("wrap");
    const on = !["off", "unavailable"].includes(r.status);
    const ctl = { h: this._ctrl("h", r), v: this._ctrl("v", r), s: this._ctrl("s", r) };
    const quiet = ctl.s && this._pv("s", ctl.s.on);
    wrap.className = `wrap s-${r.status} ${r.mode ? `m-${r.mode}` : ""} ${on ? "on" : ""} ${quiet ? "quiet" : ""}`;
    this.shadowRoot.querySelector("ha-card").classList.toggle("on", on);

    $("name").textContent = c.name || r.clim?.attributes?.friendly_name || "Airco";
    let status = this._t(`s_${r.status}`);
    if (r.status === "idle" && r.mode && MODES[r.mode]) status += ` · ${this._t(r.mode)}`;
    if (r.clim && on && r.clim.attributes.temperature != null) status += ` · ${this._fmt(r.clim.attributes.temperature, "°", this._dec(r.clim))}`;
    $("status").textContent = this._busyLabel || status;

    // LCD: target temp → room temp → mode word
    const room = this._num(c.temperature) ?? (r.clim ? r.clim.attributes.current_temperature : null);
    const tgt = r.clim ? r.clim.attributes.temperature : null;
    const lcdVal = tgt ?? (c.lcd === "mode" ? null : room);
    this.shadowRoot.querySelector(".lcd").textContent = on ? (lcdVal != null ? `${Math.round(lcdVal)}°` : MODES[r.mode]?.lcd || "ON") : "";

    // tiles
    const tiles = [];
    const tUnit = this._unit(c.temperature, r.clim?.attributes?.temperature_unit || "°C");
    if (room != null || c.temperature) tiles.push({ e: c.temperature || c.entity, icon: "mdi:home-thermometer", lbl: this._t("room"), v: this._fmt(room, tUnit) });
    const hum = this._num(c.humidity) ?? (r.clim ? r.clim.attributes.current_humidity ?? null : null);
    if (hum != null || c.humidity) tiles.push({ e: c.humidity || c.entity, icon: "mdi:water-percent", lbl: this._t("humidity"), v: this._fmt(hum, "%", 0) });
    if (c.outdoor_temperature) tiles.push({ e: c.outdoor_temperature, icon: "mdi:thermometer", lbl: this._t("outdoor"), v: this._fmt(this._num(c.outdoor_temperature), this._unit(c.outdoor_temperature, "°C")) });
    if (c.power) tiles.push({ e: c.power, icon: "mdi:flash", lbl: this._t("power"), v: this._fmt(r.watts, this._unit(c.power, "W"), 0) });
    (c.tiles || []).forEach((t) => {
      const id = typeof t === "string" ? t : t.entity, s = this._st(id);
      if (!s) return;
      const n = Number(s.state), u = s.attributes.unit_of_measurement;
      tiles.push({ e: id, icon: t.icon || s.attributes.icon || "mdi:information-outline", lbl: t.name || s.attributes.friendly_name || id, v: Number.isFinite(n) ? this._fmt(n, u, t.decimals ?? (Number.isInteger(n) ? 0 : 1)) : this._hass.formatEntityState ? this._hass.formatEntityState(s) : s.state });
    });
    const html = tiles.map((t) => `<div class="tile" data-entity="${t.e || ""}"><span class="val">${t.v}</span><span class="lbl"><ha-icon icon="${t.icon}"></ha-icon>${t.lbl}</span></div>`).join("");
    if (html !== this._tilesHtml) { $("stats").innerHTML = html; this._tilesHtml = html; }

    // buttons
    this.shadowRoot.querySelectorAll(".mode").forEach((el) => {
      const m = el.dataset.mode;
      el.classList.toggle("active", !!m && (m === r.mode || (m === "off" && r.status === "off")));
    });

    // target temperature
    const showT = r.clim && on && r.clim.attributes.temperature != null && c.show_target !== false;
    $("target").hidden = !showT;
    if (showT) {
      const v = this._pendingTarget ?? r.clim.attributes.temperature;
      $("tv").textContent = this._fmt(v, "°", this._dec(r.clim));
      $("target").classList.toggle("pending", this._pendingTarget != null);
    }
    ["h", "v"].forEach((k) => {
      const row = $(`r-${k}`), o = ctl[k];
      row.hidden = !o;
      if (!o) return;
      const sel = $(`sel-${k}`), val = this._pv(k, o.value);
      const opts = o.options.includes(val) || val == null ? o.options : [...o.options, val];
      const sig = opts.join("|");
      if (sel._sig !== sig) {
        sel.innerHTML = opts.map((x) => `<option value="${esc(x)}">${esc(o.label(x))}</option>`).join("");
        sel._sig = sig;
      }
      if (sel.value !== val) sel.value = val;
      sel.disabled = !!o.unavailable;
      row.classList.toggle("pending", val !== o.value);
    });
    $("r-s").hidden = !ctl.s;
    if (ctl.s) $("sw-s").setAttribute("aria-checked", quiet ? "true" : "false");
    $("controls").classList.toggle("closed", !(on && (showT || ctl.h || ctl.v || ctl.s)));
    if (r.clim) {
      // remember the non-quiet preset / fan speed so silent off can restore it
      const a = r.clim.attributes;
      if (a.preset_mode && !QUIET.includes(String(a.preset_mode).toLowerCase())) this._prevPreset = a.preset_mode;
      if (a.fan_mode && !QUIET.includes(String(a.fan_mode).toLowerCase())) this._prevFan = a.fan_mode;
    }
  }

  // ---------- extra controls (airflow / silent) ----------
  _valLabel(o) {
    const lang = String(this._hass?.locale?.language || this._hass?.language || "en").slice(0, 2);
    const k = String(o).toLowerCase().replace(/[\s-]+/g, "_");
    if (lang === "nl") {
      if (VAL_NL[k]) return VAL_NL[k];
      const pos = k.match(/^(?:position|pos|level|stand)_?(\d+)$/);
      if (pos) return `Stand ${pos[1]}`;
    }
    const t = String(o).replace(/[_-]+/g, " ");
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  _fmtOpt(stateObj, attr, o) {
    let t;
    try {
      t = attr ? this._hass.formatEntityAttributeValue?.(stateObj, attr, o) : this._hass.formatEntityState?.(stateObj, o);
    } catch (e) { t = null; }
    if (t != null && String(t).toLowerCase() !== String(o).toLowerCase()) return String(t);
    return this._valLabel(o);
  }

  // returns { type, options, value | on, label, set(v), unavailable } or null when the control isn't available
  _ctrl(kind, r) {
    const c = this._config, key = { h: "airflow_horizontal", v: "airflow_vertical", s: "silent" }[kind];
    if (c[key] === false) return null;
    const id = c[key];
    if (id) {
      const s = this._st(id);
      if (!s) return null;
      const dom = id.split(".")[0], unavailable = BAD.includes(String(s.state).toLowerCase());
      if (kind === "s") {
        const d = ["switch", "input_boolean", "fan", "light"].includes(dom) ? dom : "homeassistant";
        return { type: "toggle", on: s.state === "on", unavailable, set: (v) => this._hass.callService(d, v ? "turn_on" : "turn_off", { entity_id: id }) };
      }
      return {
        type: "select", options: s.attributes.options || [], value: s.state, unavailable,
        label: (o) => this._fmtOpt(s, null, o),
        set: (v) => this._hass.callService(dom === "input_select" ? "input_select" : "select", "select_option", { entity_id: id, option: v }),
      };
    }
    const cl = r.clim;
    if (!cl) return null;
    const a = cl.attributes, eid = c.entity;
    if (kind === "v" && a.swing_modes?.length) {
      return { type: "select", options: a.swing_modes, value: a.swing_mode, label: (o) => this._fmtOpt(cl, "swing_mode", o),
        set: (v) => this._hass.callService("climate", "set_swing_mode", { entity_id: eid, swing_mode: v }) };
    }
    if (kind === "h" && a.swing_horizontal_modes?.length) {
      return { type: "select", options: a.swing_horizontal_modes, value: a.swing_horizontal_mode, label: (o) => this._fmtOpt(cl, "swing_horizontal_mode", o),
        set: (v) => this._hass.callService("climate", "set_swing_horizontal_mode", { entity_id: eid, swing_horizontal_mode: v }) };
    }
    if (kind === "s") {
      const isQ = (x) => QUIET.includes(String(x).toLowerCase());
      const pq = (a.preset_modes || []).find(isQ);
      if (pq) {
        const back = () => (a.preset_modes.includes("none") ? "none" : this._prevPreset && !isQ(this._prevPreset) ? this._prevPreset : a.preset_modes.find((p) => !isQ(p)));
        return { type: "toggle", on: a.preset_mode === pq,
          set: (v) => this._hass.callService("climate", "set_preset_mode", { entity_id: eid, preset_mode: v ? pq : back() }) };
      }
      const fq = (a.fan_modes || []).find(isQ);
      if (fq) {
        const back = () => (this._prevFan && !isQ(this._prevFan) ? this._prevFan : a.fan_modes.includes("auto") ? "auto" : a.fan_modes.find((f) => !isQ(f)));
        return { type: "toggle", on: a.fan_mode === fq,
          set: (v) => this._hass.callService("climate", "set_fan_mode", { entity_id: eid, fan_mode: v ? fq : back() }) };
      }
    }
    return null;
  }

  // value to show: the one just picked until HA confirms it (max 6 s), otherwise the real one
  _pv(k, actual) {
    const p = this._pend?.[k];
    if (!p) return actual;
    if (p.v === actual || Date.now() - p.at > 6000) { delete this._pend[k]; return actual; }
    return p.v;
  }

  async _setCtrl(k, v) {
    const o = this._ctrl(k, this._resolve());
    if (!o || o.unavailable) return;
    this._pend = this._pend || {};
    this._pend[k] = { v, at: Date.now() };
    this._render();
    try { await o.set(v); }
    catch (e) { console.error("aircon-card:", e); delete this._pend[k]; this._render(); }
    setTimeout(() => this._render(), 6100);
  }

  _dec(clim) { const s = this._config.step || clim?.attributes?.target_temp_step || 0.5; return s < 1 ? 1 : 0; }

  // ---------- actions ----------
  _ripple(el, ev) {
    const r = el.getBoundingClientRect(), d = Math.max(r.width, r.height);
    const s = document.createElement("span");
    s.className = "ripple";
    s.style.cssText = `width:${d}px;height:${d}px;left:${(ev.clientX || r.left + r.width / 2) - r.left - d / 2}px;top:${(ev.clientY || r.top + r.height / 2) - r.top - d / 2}px`;
    el.appendChild(s);
    setTimeout(() => s.remove(), 650);
  }

  async _press(b, el) {
    if (!b || !this._hass) return;
    const c = this._config;
    el.classList.add("busy");
    this._busyLabel = this._t("sending");
    this._render();
    try {
      if (b.tap_action || b.action) await this._runAction(b.tap_action || b);
      else if (b.script) await this._hass.callService("script", "turn_on", { entity_id: b.script });
      else if (c.entity && c.entity.startsWith("climate.") && b.mode) {
        await this._hass.callService("climate", "set_hvac_mode", { entity_id: c.entity, hvac_mode: b.mode });
      }
      if (b.mode) {
        this._remember(b.mode);
        this._pendingMode = b.mode;
        this._pendingAt = Date.now();
      }
      if (c.state_entity && b.mode && c.set_state_entity !== false && /^input_select\./.test(c.state_entity)) {
        const opts = this._st(c.state_entity)?.attributes?.options || [];
        const opt = opts.find((o) => (c.state_map?.[o] || toMode(o)) === b.mode);
        if (opt && this._st(c.state_entity).state !== opt) await this._hass.callService("input_select", "select_option", { entity_id: c.state_entity, option: opt });
      }
    } catch (e) {
      console.error("aircon-card:", e);
    } finally {
      setTimeout(() => { el.classList.remove("busy"); this._busyLabel = null; this._render(); }, 600);
    }
  }

  // supports: { action: "perform-action", perform_action: "script.turn_on", target: {...}, data: {...} }
  //           { action: "script.my_script" } shorthand, { service: "x.y", data: {...} } (legacy), more-info, navigate, url
  async _runAction(a) {
    const hass = this._hass;
    const type = a.action;
    if (type === "more-info") return this._moreInfo(a.entity || this._config.entity);
    if (type === "navigate") { history.pushState(null, "", a.navigation_path); window.dispatchEvent(new Event("location-changed")); return; }
    if (type === "url") { window.open(a.url_path, "_blank"); return; }
    let svc = a.perform_action || a.service || (type && type !== "perform-action" && type !== "call-service" ? type : null);
    if (!svc) return;
    let data = { ...(a.data || a.service_data || {}) };
    if (/^script\.[^.]+$/.test(svc) && !svc.startsWith("script.turn_")) {
      // "script.airco_koelen" → script.turn_on on that script
      data = { entity_id: svc, ...(Object.keys(data).length ? { variables: data } : {}) };
      svc = "script.turn_on";
    }
    const [d, s] = svc.split(".");
    return hass.callService(d, s, data, a.target);
  }

  _nudge(dir) {
    const r = this._resolve();
    if (!r.clim) return;
    const a = r.clim.attributes, step = this._config.step || a.target_temp_step || 0.5;
    const cur = this._pendingTarget ?? a.temperature;
    let v = Math.round((cur + dir * step) / step) * step;
    v = Math.min(a.max_temp ?? 35, Math.max(a.min_temp ?? 10, v));
    this._pendingTarget = v;
    this._render();
    clearTimeout(this._tTimer);
    this._tTimer = setTimeout(async () => {
      try { await this._hass.callService("climate", "set_temperature", { entity_id: this._config.entity, temperature: v }); }
      catch (e) { console.error("aircon-card:", e); }
      this._pendingTarget = null;
      this._render();
    }, 900);
  }

  _moreInfo(entityId) {
    if (!entityId) return;
    this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId }, bubbles: true, composed: true }));
  }
}


// ======================================================================
// Visual editor
// ======================================================================
const ED_TXT = {
  en: {
    name: "Name", entity: "Climate entity (optional)", state_entity: "Mode helper (input_select / sensor)",
    temperature: "Room temperature sensor", humidity: "Humidity sensor", outdoor_temperature: "Outdoor temperature sensor",
    power: "Power sensor", power_threshold: "Power threshold (W) — below = at target", columns: "Buttons per row",
    show_target: "Show target temperature control", hide_buttons: "Hide buttons", set_state_entity: "Card updates the mode helper",
    sec_main: "Device", sec_sensors: "Sensors", sec_layout: "Layout", sec_buttons: "Buttons",
    mode: "Mode", btn_name: "Label (optional)", icon: "Icon (optional)", script: "Script to run", color: "Colour (optional, e.g. #e040fb)",
    add: "Add button", none: "— none —", from_climate: "No buttons configured: they're generated from the climate entity (or cool / heat / off).",
    yaml_action: "Uses a custom action from YAML — edit it in the code editor.",
    up: "Move up", down: "Move down", remove: "Remove",
    sec_controls: "Extra controls", airflow_horizontal: "Airflow horizontal (select)", airflow_vertical: "Airflow vertical (select)",
    silent: "Silent mode (switch)", controls_hint: "Shown below the target temperature while the AC is on. Leave empty to use the climate entity's swing modes / quiet preset, if it has them.",
  },
  nl: {
    name: "Naam", entity: "Climate-entiteit (optioneel)", state_entity: "Modus-helper (input_select / sensor)",
    temperature: "Kamertemperatuur-sensor", humidity: "Vochtigheidssensor", outdoor_temperature: "Buitentemperatuur-sensor",
    power: "Vermogenssensor", power_threshold: "Vermogensdrempel (W) — eronder = op temperatuur", columns: "Knoppen per rij",
    show_target: "Doeltemperatuur-regeling tonen", hide_buttons: "Knoppen verbergen", set_state_entity: "Kaart werkt de modus-helper bij",
    sec_main: "Apparaat", sec_sensors: "Sensoren", sec_layout: "Weergave", sec_buttons: "Knoppen",
    mode: "Modus", btn_name: "Label (optioneel)", icon: "Icoon (optioneel)", script: "Uit te voeren script", color: "Kleur (optioneel, bijv. #e040fb)",
    add: "Knop toevoegen", none: "— geen —", from_climate: "Geen knoppen ingesteld: ze worden gemaakt uit de climate-entiteit (of koelen / verwarmen / uit).",
    yaml_action: "Gebruikt een eigen actie uit YAML — pas die aan in de code-editor.",
    up: "Omhoog", down: "Omlaag", remove: "Verwijderen",
    sec_controls: "Extra bediening", airflow_horizontal: "Luchtstroom horizontaal (select)", airflow_vertical: "Luchtstroom verticaal (select)",
    silent: "Stille modus (schakelaar)", controls_hint: "Zichtbaar onder de doeltemperatuur zolang de airco aan staat. Leeg laten = de zwenkstanden / stille preset van de climate-entiteit gebruiken, als die er zijn.",
  },
};

const ED_STYLE = `
.section { margin-top: 20px; }
.section h3 { margin: 0 0 8px; font-size: 15px; font-weight: 500; color: var(--primary-text-color); }
.hint { font-size: 12px; color: var(--secondary-text-color); margin: 0 0 10px; }
.btn-row { border: 1px solid var(--divider-color, rgba(127,127,127,.3)); border-radius: 12px; padding: 8px 10px 10px; margin-bottom: 10px; }
.btn-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.btn-head .sw { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; color: #fff; flex: none; }
.btn-head .sw ha-icon { --mdc-icon-size: 18px; }
.btn-head .t { flex: 1; font-weight: 500; font-size: 14px; color: var(--primary-text-color); }
.btn-head button, .add { border: none; background: none; cursor: pointer; color: var(--secondary-text-color); border-radius: 50%; width: 32px; height: 32px; display: grid; place-items: center; }
.btn-head button:hover { background: rgba(127,127,127,.15); color: var(--primary-text-color); }
.btn-head button[disabled] { opacity: .3; pointer-events: none; }
.add { width: auto; height: auto; border-radius: 10px; padding: 8px 14px; display: inline-flex; gap: 6px; align-items: center; font: inherit; font-size: 14px; color: var(--primary-color); border: 1px dashed var(--primary-color); }
.add:hover { background: color-mix(in srgb, var(--primary-color) 10%, transparent); }
.note { font-size: 12px; color: var(--secondary-text-color); margin: 2px 0 6px; }
`;

const MODE_ORDER = ["cool", "heat", "dry", "fan_only", "auto", "heat_cool", "off"];

class AirconCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...config };
    this._render();
  }
  set hass(hass) {
    this._hass = hass;
    this.shadowRoot?.querySelectorAll("ha-form").forEach((f) => (f.hass = hass));
    if (!this._built) this._render();
  }

  _t(k) {
    const lang = String(this._hass?.locale?.language || this._hass?.language || "en").slice(0, 2);
    return (ED_TXT[lang] || ED_TXT.en)[k] ?? ED_TXT.en[k] ?? k;
  }
  _ct(k) {
    const lang = String(this._hass?.locale?.language || this._hass?.language || "en").slice(0, 2);
    return (TXT[lang] || TXT.en)[k] ?? k;
  }

  _mainSchema() {
    const sensor = (dc) => ({ entity: { domain: "sensor", ...(dc ? { device_class: dc } : {}) } });
    return {
      main: [
        { name: "name", selector: { text: {} } },
        { name: "entity", selector: { entity: { domain: "climate" } } },
        { name: "state_entity", selector: { entity: { domain: ["input_select", "select", "input_text", "sensor"] } } },
        ...(String(this._config.state_entity || "").startsWith("input_select.") ? [{ name: "set_state_entity", selector: { boolean: {} } }] : []),
      ],
      sensors: [
        { name: "temperature", selector: sensor("temperature") },
        { name: "humidity", selector: sensor("humidity") },
        { name: "outdoor_temperature", selector: sensor("temperature") },
        { name: "power", selector: sensor("power") },
        ...(this._config.power ? [{ name: "power_threshold", selector: { number: { min: 0, max: 500, step: 1, mode: "box", unit_of_measurement: "W" } } }] : []),
      ],
      controls: [
        { name: "airflow_horizontal", selector: { entity: { domain: ["select", "input_select"] } } },
        { name: "airflow_vertical", selector: { entity: { domain: ["select", "input_select"] } } },
        { name: "silent", selector: { entity: { domain: ["switch", "input_boolean"] } } },
      ],
      layout: [
        { name: "columns", selector: { number: { min: 1, max: 6, step: 1, mode: "slider" } } },
        { name: "show_target", selector: { boolean: {} } },
        { name: "hide_buttons", selector: { boolean: {} } },
      ],
    };
  }

  _btnSchema() {
    return [
      { name: "mode", selector: { select: { mode: "dropdown", options: [{ value: "", label: this._t("none") }, ...MODE_ORDER.map((m) => ({ value: m, label: this._ct(m) }))] } } },
      { type: "grid", name: "", schema: [
        { name: "name", selector: { text: {} } },
        { name: "icon", selector: { icon: {} } },
      ] },
      { name: "script", selector: { entity: { domain: "script" } } },
      { name: "color", selector: { text: {} } },
    ];
  }

  _render() {
    if (!this._config) return;
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    const btns = Array.isArray(this._config.buttons) ? this._config.buttons.map((b) => (typeof b === "string" ? { mode: b } : b)) : [];
    const sig = btns.length + "|" + (this._config.power ? 1 : 0) + "|" + (String(this._config.state_entity || "").startsWith("input_select.") ? 1 : 0);
    if (this._built && sig === this._sig) { this._update(btns); return; }
    this._sig = sig;
    this._built = true;
    const sch = this._mainSchema();
    this.shadowRoot.innerHTML = `<style>${ED_STYLE}</style>
      <div class="section" style="margin-top:0"><h3>${this._t("sec_main")}</h3><div id="f-main"></div></div>
      <div class="section"><h3>${this._t("sec_buttons")}</h3>
        ${btns.length ? "" : `<p class="hint">${this._t("from_climate")}</p>`}
        <div id="btns">${btns.map((b, i) => `
          <div class="btn-row" data-i="${i}">
            <div class="btn-head">
              <span class="sw"><ha-icon></ha-icon></span><span class="t"></span>
              <button data-act="up" title="${this._t("up")}" ${i === 0 ? "disabled" : ""}><ha-icon icon="mdi:arrow-up"></ha-icon></button>
              <button data-act="down" title="${this._t("down")}" ${i === btns.length - 1 ? "disabled" : ""}><ha-icon icon="mdi:arrow-down"></ha-icon></button>
              <button data-act="remove" title="${this._t("remove")}"><ha-icon icon="mdi:delete-outline"></ha-icon></button>
            </div>
            <div class="note" hidden>${this._t("yaml_action")}</div>
            <div class="f-btn"></div>
          </div>`).join("")}</div>
        <button class="add" id="add"><ha-icon icon="mdi:plus"></ha-icon>${this._t("add")}</button>
      </div>
      <div class="section"><h3>${this._t("sec_sensors")}</h3><div id="f-sensors"></div></div>
      <div class="section"><h3>${this._t("sec_controls")}</h3><p class="hint">${this._t("controls_hint")}</p><div id="f-controls"></div></div>
      <div class="section"><h3>${this._t("sec_layout")}</h3><div id="f-layout"></div></div>`;

    const mkForm = (host, schema, data, onChange) => {
      const f = document.createElement("ha-form");
      f.hass = this._hass;
      f.schema = schema;
      f.data = data;
      f.computeLabel = (s) => this._t(s.name === "name" && host.classList.contains("f-btn") ? "btn_name" : s.name);
      f.addEventListener("value-changed", (ev) => { ev.stopPropagation(); onChange(ev.detail.value); });
      host.appendChild(f);
      return f;
    };
    const $ = (id) => this.shadowRoot.getElementById(id);
    this._forms = {
      main: mkForm($("f-main"), sch.main, {}, (v) => this._patch(v, ["name", "entity", "state_entity", "set_state_entity"])),
      sensors: mkForm($("f-sensors"), sch.sensors, {}, (v) => this._patch(v, ["temperature", "humidity", "outdoor_temperature", "power", "power_threshold"])),
      controls: mkForm($("f-controls"), sch.controls, {}, (v) => this._patch(v, ["airflow_horizontal", "airflow_vertical", "silent"])),
      layout: mkForm($("f-layout"), sch.layout, {}, (v) => this._patch(v, ["columns", "show_target", "hide_buttons"])),
      btns: [...this.shadowRoot.querySelectorAll(".btn-row")].map((row) => {
        const i = Number(row.dataset.i);
        return mkForm(row.querySelector(".f-btn"), this._btnSchema(), {}, (v) => this._patchBtn(i, v));
      }),
    };
    $("add").addEventListener("click", () => {
      const cur = this._buttonsNow(), used = cur.map((b) => b.mode);
      const next = ["cool", "heat", "off", "dry", "fan_only", "auto"].find((m) => !used.includes(m)) || "";
      this._setButtons([...cur, { mode: next }]);
    });
    $("btns").addEventListener("click", (ev) => {
      const b = ev.target.closest("button[data-act]");
      if (!b) return;
      const i = Number(b.closest(".btn-row").dataset.i), list = [...this._buttonsNow()];
      if (b.dataset.act === "remove") list.splice(i, 1);
      if (b.dataset.act === "up" && i > 0) [list[i - 1], list[i]] = [list[i], list[i - 1]];
      if (b.dataset.act === "down" && i < list.length - 1) [list[i + 1], list[i]] = [list[i], list[i + 1]];
      this._setButtons(list);
    });
    this._update(btns);
  }

  _update(btns) {
    const c = this._config;
    this._forms.main.data = { name: c.name, entity: c.entity, state_entity: c.state_entity, set_state_entity: c.set_state_entity !== false };
    this._forms.sensors.data = { temperature: c.temperature, humidity: c.humidity, outdoor_temperature: c.outdoor_temperature, power: c.power, power_threshold: c.power_threshold ?? 30 };
    const ent = (v) => (typeof v === "string" ? v : undefined);
    this._forms.controls.data = { airflow_horizontal: ent(c.airflow_horizontal), airflow_vertical: ent(c.airflow_vertical), silent: ent(c.silent) };
    this._forms.layout.data = { columns: c.columns, show_target: c.show_target !== false, hide_buttons: !!c.hide_buttons };
    const rows = this.shadowRoot.querySelectorAll(".btn-row");
    btns.forEach((b, i) => {
      const row = rows[i];
      if (!row) return;
      this._forms.btns[i].data = { mode: b.mode || "", name: b.name, icon: b.icon, script: b.script, color: b.color };
      const m = MODES[b.mode];
      row.querySelector(".sw").style.background = b.color || m?.color || "#9aa3ad";
      row.querySelector(".sw ha-icon").setAttribute("icon", b.icon || m?.icon || "mdi:gesture-tap");
      row.querySelector(".t").textContent = b.name || (b.mode ? this._ct(b.mode) : `#${i + 1}`);
      row.querySelector(".note").hidden = !(b.action || b.tap_action || b.perform_action || b.service);
    });
  }

  _buttonsNow() {
    return Array.isArray(this._config.buttons) ? this._config.buttons.map((b) => (typeof b === "string" ? { mode: b } : { ...b })) : [];
  }

  _patch(v, keys) {
    const c = { ...this._config };
    keys.forEach((k) => {
      let val = v[k];
      if (k === "show_target" || k === "set_state_entity") val = val === false ? false : undefined; // default true → omit
      if (k === "hide_buttons") val = val ? true : undefined;
      if (k === "power_threshold" && (val === 30 || !c.power)) val = undefined;
      if ((val === "" || val == null) && c[k] === false) return; // "false" (hide) is YAML-only, keep it
      if (val === "" || val === null || val === undefined) delete c[k];
      else c[k] = val;
    });
    this._emit(c);
  }

  _patchBtn(i, v) {
    const list = this._buttonsNow();
    const b = { ...list[i] };
    ["mode", "name", "icon", "script", "color"].forEach((k) => {
      if (v[k] === "" || v[k] == null) delete b[k];
      else b[k] = v[k];
    });
    list[i] = b;
    this._setButtons(list);
  }

  _setButtons(list) {
    const c = { ...this._config };
    if (list.length) c.buttons = list; else delete c.buttons;
    this._emit(c);
  }

  _emit(config) {
    // keep "type" first so the YAML stays tidy
    const { type, ...rest } = config;
    this._config = { type, ...rest };
    this._render();
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
  }
}
customElements.define("aircon-card-editor", AirconCardEditor);

customElements.define("aircon-card", AirconCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "aircon-card", name: "Aircon card", description: "Animated air-conditioner card with mode buttons (climate entity or scripts)", preview: true });
console.info(`%c AIRCON-CARD %c ${CARD_VERSION} `, "color:#fff;background:#4fc3f7;font-weight:700", "color:#4fc3f7");
