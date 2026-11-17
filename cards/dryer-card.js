/*
 * dryer-card — animated tumble-dryer card for Home Assistant
 * Works with Home Connect (Bosch/Siemens), Miele, LG, Samsung… through an operation-state sensor,
 * or with just a smart plug's power sensor. Same design language as aircon-, heating- and awning-card.
 * Everything below the DEV block is the shared appliance engine, identical in dishwasher-card and washer-card.
 */
const TD_VERSION = "1.0.0";

const DEV = {
  key: "dryer", tag: "dryer-card", version: TD_VERSION, accent: "#ff8a65",
  title: "Dryer card", description: "Animated tumble-dryer card: program, drying level, time left, progress, start/pause/stop, water tank and filter warnings",
  match: /dryer|droger|trockner|seche_linge|asciugatrice/, exclude: null,
  programIcon: "mdi:tumble-dryer",
  tiles: [
    { key: "drying_target", icon: "mdi:tshirt-crew-outline", stub: ["select", /drying_target|dry_level|dryness/] },
  ],
  alerts: [
    { key: "water_tank", stub: ["binary_sensor", /water_tank|condens|container/] },
    { key: "lint_filter", stub: ["binary_sensor", /filter|lint|fluff/] },
  ],
  phases: [
    { cls: "cooling", re: /cool|afkoel|abkühl|refroid/i },
    { cls: "anticrease", re: /crease|kreuk|knitter|froiss/i },
  ],
  txt: {
    en: { dev_name: "Dryer", drying_target: "Drying level", water_tank: "Water tank full (sensor)", lint_filter: "Clean filter (sensor)",
      a_water_tank: "Empty the water tank", a_lint_filter: "Clean the fluff filter" },
    nl: { dev_name: "Droger", drying_target: "Droogstand", water_tank: "Condensbak vol (sensor)", lint_filter: "Filter reinigen (sensor)",
      a_water_tank: "Condensbak legen", a_lint_filter: "Pluizenfilter reinigen" },
  },
  svg: `
<defs>
<linearGradient id="ID-body" x1="0" x2="1"><stop offset="0" stop-color="#e6eaee"/><stop offset=".45" stop-color="#ffffff"/><stop offset="1" stop-color="#cdd3d9"/></linearGradient>
<linearGradient id="ID-chrome" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbfcfd"/><stop offset=".3" stop-color="#a3abb4"/><stop offset=".55" stop-color="#eef1f4"/><stop offset=".8" stop-color="#8d959f"/><stop offset="1" stop-color="#c9ced4"/></linearGradient>
<radialGradient id="ID-drum" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#626d78"/><stop offset=".75" stop-color="#2f363d"/><stop offset="1" stop-color="#1a1f24"/></radialGradient>
<radialGradient id="ID-glass" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#c9b8a8" stop-opacity=".16"/><stop offset="1" stop-color="#14100d" stop-opacity=".6"/></radialGradient>
<radialGradient id="ID-heat" cx=".5" cy=".6" r=".55"><stop class="td-hs" offset="0" stop-color="#ff9a4a" stop-opacity=".75"/><stop class="td-hs" offset=".7" stop-color="#ff7a2e" stop-opacity=".18"/><stop class="td-hs" offset="1" stop-color="#ff7a2e" stop-opacity="0"/></radialGradient>
<clipPath id="ID-drumclip"><circle cx="60" cy="80" r="24.5"/></clipPath>
</defs>
<ellipse cx="60" cy="135" rx="45" ry="3.4" fill="#000" opacity=".16"/>
<g class="td-air" fill="none" stroke="#ffab91" stroke-width="1.2" stroke-linecap="round">
  <path d="M40 4c-2-3 2-5 0-8"/><path d="M60 4c-2-3 2-5 0-8"/><path d="M80 4c-2-3 2-5 0-8"/>
</g>
<rect x="22" y="129" width="9" height="5" rx="1.5" fill="#7d8790"/><rect x="89" y="129" width="9" height="5" rx="1.5" fill="#7d8790"/>
<rect x="14" y="6" width="92" height="126" rx="8" fill="url(#ID-body)" stroke="#aab2ba" stroke-width=".7"/>
<path d="M18 30h84" stroke="#d3d9de" stroke-width=".7"/>
<rect x="20" y="11" width="25" height="13.5" rx="2" fill="#f4f6f8" stroke="#c4ccd4" stroke-width=".5"/>
<rect x="23.5" y="14.5" width="9" height="6.5" rx="1.2" fill="#cfd8de"/>
<rect class="td-tank" x="23.5" y="18" width="9" height="3" rx="1" fill="#4fc3f7" opacity=".8"/>
<path d="M36 21.2h6" stroke="#b8c0c8" stroke-width="1.4" stroke-linecap="round"/>
<rect x="50" y="12.2" width="31" height="11" rx="2.2" fill="#0c1720" opacity=".92"/>
<text class="lcd" x="65.5" y="17.8" text-anchor="middle"></text>
<circle class="led led-pwr" cx="86" cy="12.5" r="1.1"/>
<circle cx="94" cy="18" r="7" fill="url(#ID-chrome)" stroke="#8d959f" stroke-width=".5"/>
<circle cx="94" cy="18" r="4.8" fill="#e8ecef"/>
<path d="M94 14.2v2.6" stroke="#5c6a76" stroke-width="1.3" stroke-linecap="round" transform="rotate(60 94 18)"/>
<circle cx="60" cy="80" r="35" fill="#eef1f4" stroke="#cfd5db" stroke-width=".8"/>
<circle cx="60" cy="80" r="26.5" fill="#1a1f24"/>
<g clip-path="url(#ID-drumclip)">
  <circle cx="60" cy="80" r="24.5" fill="url(#ID-drum)"/>
  <circle class="td-glow" cx="60" cy="80" r="24.5" fill="url(#ID-heat)"/>
  <g class="td-drum">
    <g fill="#8a96a1" opacity=".5"><circle cx="60" cy="61" r=".9"/><circle cx="73.4" cy="66.6" r=".9"/><circle cx="79" cy="80" r=".9"/><circle cx="73.4" cy="93.4" r=".9"/><circle cx="60" cy="99" r=".9"/><circle cx="46.6" cy="93.4" r=".9"/><circle cx="41" cy="80" r=".9"/><circle cx="46.6" cy="66.6" r=".9"/></g>
    <g fill="#9aa5af"><path d="M58 56h4l-.6 5h-2.8z"/><path d="M58 56h4l-.6 5h-2.8z" transform="rotate(120 60 80)"/><path d="M58 56h4l-.6 5h-2.8z" transform="rotate(240 60 80)"/></g>
  </g>
  <g class="td-load">
    <path d="M44 93c3-6 10-8 15-5c4-4 12-3 14 3c3 1 4 6 1 9c-6 4-24 4-29 0c-2-2-2-5-1-7z" fill="#81c784"/>
    <path d="M50 96c2-4 7-5 10-2c3-2 8-1 9 2c-3 3-15 3-19 0z" fill="#f4f6f8"/>
    <path d="M62 88c3-3 8-2 10 1c1 2-1 4-4 4c-3 0-6-2-6-5z" fill="#9575cd"/>
    <path d="M45 92c1-3 5-4 7-2c1 2-1 4-4 4c-2 0-3-1-3-2z" fill="#ffb74d"/>
  </g>
  <g class="td-sock"><path d="M58 64c2-1 4 0 4 2l1 5c1 1 0 3-2 3h-3c-1 0-2-1-1-2z" fill="#4db6ac"/></g>
</g>
<g class="td-door">
  <circle cx="60" cy="80" r="29" fill="none" stroke="url(#ID-chrome)" stroke-width="5"/>
  <circle cx="60" cy="80" r="26.5" fill="url(#ID-glass)"/>
  <path d="M40.5 71a21 21 0 0 1 13.5-12.5" stroke="#fff" stroke-opacity=".55" stroke-width="2" fill="none" stroke-linecap="round"/>
  <rect x="86.5" y="73" width="4.5" height="14" rx="2.2" fill="url(#ID-chrome)" stroke="#8d959f" stroke-width=".4"/>
</g>`,
  css: `
.td-door { transform-box: view-box; transform-origin: 28.5px 80px; transition: transform .8s cubic-bezier(.4,1.3,.5,1); }
.door-open .td-door { transform: scaleX(.16); }
.td-drum, .td-load, .td-sock { transform-box: view-box; transform-origin: 60px 80px; }
.s-running .td-drum { animation: spin 2s linear infinite; }
.s-running .td-load { animation: tumble2 2s ease-in-out infinite; }
.td-sock { opacity: 0; }
.s-running .td-sock { animation: fall 2s ease-in infinite; }
.anticrease .td-drum { animation-duration: 4s; }
.anticrease .td-load, .anticrease .td-sock { animation: none; opacity: 0; }
.anticrease .td-load { opacity: 1; }
.td-glow { opacity: 0; transition: opacity 1.2s; }
.s-running .td-glow { opacity: .85; animation: glow 2s ease-in-out infinite; }
.cooling .td-hs { stop-color: #4fc3f7; }
.td-air path { opacity: 0; transform-box: fill-box; transform-origin: center; }
.s-running:not(.cooling):not(.anticrease) .td-air path { animation: rise 2s ease-out infinite; }
.td-air path:nth-child(2) { animation-delay: .67s !important; } .td-air path:nth-child(3) { animation-delay: 1.33s !important; }
.td-tank { transform-box: fill-box; transform-origin: bottom; }
.s-running .td-tank { animation: fill 4s ease-in-out infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes tumble2 { 0%,100% { transform: rotate(-35deg); } 50% { transform: rotate(40deg); } }
@keyframes fall { 0%,30% { opacity: 0; transform: rotate(-30deg) translateY(0); } 40% { opacity: 1; } 90% { opacity: 1; transform: rotate(10deg) translateY(22px); } 100% { opacity: 0; transform: rotate(10deg) translateY(24px); } }
@keyframes rise { 0% { opacity: 0; transform: translateY(4px); } 30% { opacity: .8; } 100% { opacity: 0; transform: translateY(-6px); } }
@keyframes fill { 0%,100% { transform: scaleY(.5); } 50% { transform: scaleY(1); } }
`,
};

// ======================================================================
// Shared appliance engine (identical in dishwasher-, washer- and dryer-card;
// only the DEV block above differs). Change it in all three files.
// ======================================================================
const TXT = {
  en: {
    s_off: "Off", s_idle: "Ready", s_delayed: "Delayed start", s_running: "Running", s_paused: "Paused", s_action: "Action required",
    s_finished: "Finished", s_error: "Fault", s_unavailable: "Unavailable", sending: "Sending…", door_open: "Door open",
    left: "{d} left", ready_at: "Ready at", power: "Power", energy: "Energy", program: "Program", progress: "Progress",
    start: "Start", pause: "Pause", resume: "Resume", stop: "Stop", power_btn: "Power", h: "h", min: "min",
  },
  nl: {
    s_off: "Uit", s_idle: "Gereed", s_delayed: "Uitgestelde start", s_running: "Bezig", s_paused: "Gepauzeerd", s_action: "Actie vereist",
    s_finished: "Klaar", s_error: "Storing", s_unavailable: "Niet beschikbaar", sending: "Versturen…", door_open: "Deur open",
    left: "nog {d}", ready_at: "Klaar om", power: "Vermogen", energy: "Energie", program: "Programma", progress: "Voortgang",
    start: "Start", pause: "Pauze", resume: "Hervatten", stop: "Stop", power_btn: "Aan/uit", h: "u", min: "min",
  },
};
Object.keys(DEV.txt).forEach((l) => Object.assign(TXT[l], DEV.txt[l]));
const BAD = ["unavailable", "unknown", "none", ""];
const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
const lang = (hass) => String(hass?.locale?.language || hass?.language || "en").slice(0, 2);
// "BSH.Common.EnumType.OperationState.Run" → "run", "Program ended" → "program_ended"
const norm = (v) => String(v ?? "").trim().toLowerCase().split(".").pop().replace(/[\s-]+/g, "_");
const pretty = (v) => {
  let s = String(v ?? "").split(".").pop();
  s = s.replace(/^(dishcare_dishwasher|laundry_care_(washer|dryer|washer_dryer))_(program|enum_type)_/i, "").replace(/_/g, " ").trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
};
const STATE_MAP = {
  off: ["off", "inactive", "power_off", "switched_off"],
  idle: ["ready", "on", "idle", "standby", "programmed", "program_selected", "not_running", "stopped", "waiting"],
  delayed: ["delayedstart", "delayed_start", "waiting_to_start", "programmed_waiting_to_start", "scheduled", "delayed"],
  running: ["run", "running", "in_use", "inuse", "busy", "washing", "drying", "rinsing", "spinning", "cleaning", "aborting", "started", "main_wash"],
  paused: ["pause", "paused", "interrupted"],
  action: ["actionrequired", "action_required", "rinse_hold"],
  finished: ["finished", "program_ended", "end", "ended", "done", "complete", "completed", "program_end"],
  error: ["error", "failure", "fault", "service", "alarm"],
};
const ACTIVE = ["on", "present", "true", "low", "full", "empty", "nearly_empty", "problem", "yes", "alarm", "detected"];
const ACTS = {
  power: { icon: "mdi:power", color: "#90a4ae", lbl: "power_btn" },
  start: { icon: "mdi:play", color: null, lbl: "start" },
  pause: { icon: "mdi:pause", color: "#ffb300", lbl: "pause", light: true },
  stop: { icon: "mdi:stop", color: "#ef5350", lbl: "stop" },
};
const LIVE = ["running", "paused", "delayed", "action"];

const STYLE = `
:host {
  --ap-accent: ${DEV.accent};
  --ap-off: var(--disabled-text-color, #9aa3ad);
  --ap-alert: var(--error-color, #db4437);
  display: block; height: 100%;
}
:host([paused]) *, :host([paused]) *::before, :host([paused]) *::after { animation-play-state: paused !important; }
ha-card { height: 100%; overflow: hidden; container-type: inline-size; position: relative; }
ha-card::before {
  content: ""; position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 1s, background 1s;
  background: radial-gradient(120% 90% at 0% 0%, color-mix(in srgb, var(--c) 18%, transparent), transparent 60%);
}
ha-card.on::before { opacity: 1; }
.wrap { --c: var(--ap-off); padding: 14px; display: flex; flex-direction: column; gap: 12px; position: relative; }
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
.dot { width: 8px; height: 8px; border-radius: 50%; flex: none; background: var(--c); transition: background .4s; position: relative; }
.on .dot { box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 25%, transparent); }
.s-running .dot::after, .s-action .dot::after { content: ""; position: absolute; inset: 0; border-radius: 50%; background: var(--c); animation: pulse 2s ease-out infinite; }
.alert { display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; color: var(--ap-alert); }
.alert ha-icon { --mdc-icon-size: 15px; flex: none; }
.alert[hidden] { display: none; }
.stats { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 6px; }
.stats:empty { display: none; }
.stats.n3 { grid-template-columns: repeat(3, minmax(0,1fr)); }
.tile { display: flex; flex-direction: column; padding: 6px 9px; border-radius: 10px; min-width: 0; background: rgba(127,127,127,.09); cursor: pointer; }
.tile:hover { background: rgba(127,127,127,.16); }
.val { font-size: 14px; font-weight: 600; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-variant-numeric: tabular-nums; }
.lbl { display: flex; align-items: center; gap: 3px; font-size: 11px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lbl ha-icon { --mdc-icon-size: 13px; flex: none; }

.modes { display: grid; grid-template-columns: repeat(var(--n, 3), minmax(0,1fr)); gap: 8px; }
.mode {
  --mc: var(--ap-off); --mt: #fff;
  position: relative; overflow: hidden; border: none; border-radius: 12px; padding: 9px 4px 8px; cursor: pointer; font: inherit;
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  color: var(--secondary-text-color); background: rgba(127,127,127,.10);
  transition: background .3s, color .3s, transform .15s, box-shadow .3s, opacity .3s;
}
.mode.light { --mt: #2a1a05; }
.mode ha-icon { --mdc-icon-size: 22px; color: var(--mc); transition: color .3s, transform .4s; }
.mode .ml { font-size: 12px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.mode:hover { background: rgba(127,127,127,.17); }
.mode:active { transform: scale(.96); }
.mode:focus-visible { outline: 2px solid var(--mc); outline-offset: 2px; }
.mode.active { color: var(--mt); background: var(--mc); box-shadow: 0 4px 14px -4px color-mix(in srgb, var(--mc) 70%, transparent); }
.mode.active ha-icon { color: var(--mt); }
.mode.dim { opacity: .42; pointer-events: none; }
.mode[data-act=start].active ha-icon { animation: nudge 2s ease-in-out infinite; }
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
.sel { position: relative; display: flex; align-items: center; max-width: 60%; }
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
.bar { position: relative; flex: 0 0 38%; height: 8px; border-radius: 4px; overflow: hidden; background: rgba(127,127,127,.2); }
.bar span { position: absolute; inset: 0; border-radius: 4px; background: var(--c); transform-origin: left center; transform: scaleX(var(--p, 0)); transition: transform 1s ease; }
.s-running .bar::after {
  content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent);
  animation: sweep 2s linear infinite;
}
.pv { min-width: 40px; margin-right: 6px; text-align: right; font-size: 13px; font-weight: 600; color: var(--primary-text-color); font-variant-numeric: tabular-nums; }

.wrap.s-idle { --c: color-mix(in srgb, var(--ap-accent) 55%, var(--ap-off)); }
.wrap.s-running { --c: var(--ap-accent); }
.wrap.s-delayed { --c: #b39ddb; }
.wrap.s-paused, .wrap.s-action { --c: #ffb300; }
.wrap.s-finished { --c: #3ddc84; }
.wrap.s-error { --c: var(--ap-alert); }

/* ---- illustration: shared bits ---- */
.lcd { font: 700 8.5px ui-monospace, "Courier New", monospace; dominant-baseline: central; fill: #5c6a76; transition: fill .4s; }
.on .lcd { fill: var(--c); }
.s-error .lcd { fill: var(--ap-alert); }
.led { fill: #5a636d; transition: fill .3s; }
.led-pwr { fill: #3ddc84; }
.s-off .led-pwr, .s-unavailable .led-pwr { fill: #5a636d; }
.s-paused .led-pwr, .s-action .led-pwr, .s-error .led-pwr { fill: var(--c); animation: blink 1s steps(2, start) infinite; }
${DEV.css}

@keyframes glow { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
@keyframes pulse { 0% { transform: scale(1); opacity: .55; } 100% { transform: scale(2.8); opacity: 0; } }
@keyframes sweep { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
@keyframes ripple { to { transform: scale(2.6); opacity: 0; } }
@keyframes blink { to { visibility: hidden; } }
@keyframes nudge { 0%,100% { transform: translateX(0); } 50% { transform: translateX(2px); } }
@keyframes puff { 0% { opacity: 0; transform: translateY(0) scale(.6); } 25% { opacity: .75; } 100% { opacity: 0; transform: translateY(-14px) scale(1.7); } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; } }
@container (max-width: 340px) {
  .illus { width: var(--aircon-illustration-size-small, 84px); grid-row: auto; }
  .stats { grid-column: 1 / -1; }
  .mode .ml { font-size: 11px; }
}
`;

class Card extends HTMLElement {
  static async getConfigElement() {
    if (!customElements.get("ha-form") || !customElements.get("ha-entity-picker")) {
      try {
        const helpers = await window.loadCardHelpers?.();
        const tile = await helpers?.createCardElement({ type: "tile", entity: "sun.sun" });
        await tile?.constructor?.getConfigElement?.();
      } catch (e) { /* ignore */ }
    }
    return document.createElement(`${DEV.tag}-editor`);
  }

  // best-effort pre-fill: finds the appliance by name, then its sibling entities (Home Connect / Miele naming)
  static getStubConfig(hass) {
    const all = Object.keys(hass?.states || {});
    const ids = all.filter((e) => DEV.match.test(e) && !(DEV.exclude && DEV.exclude.test(e)));
    const find = (dom, re) => ids.find((e) => e.startsWith(`${dom}.`) && re.test(e.split(".")[1]));
    const cfg = { name: (TXT[lang(hass)] || TXT.en).dev_name };
    const pick = {
      state_entity: find("sensor", /operation_state|_status$|_state$/) || find("sensor", /^[a-z0-9]+$/),
      power_switch: find("switch", /power$/),
      program: find("select", /selected_program/) || find("sensor", /program$|_program_name|selected_program/),
      phase: find("sensor", /phase/),
      remaining: find("sensor", /remaining|finish_time|end_time/),
      progress: find("sensor", /progress/),
      door: find("binary_sensor", /door/) || find("sensor", /door/),
      start: find("select", /active_program/) || find("button", /start/),
      pause: find("button", /pause/),
      resume: find("button", /resume/),
      stop: find("button", /stop|abort/),
      power: find("sensor", /_power$|_power_|watt/),
      energy: find("sensor", /energy/),
      ...Object.fromEntries([...DEV.tiles, ...DEV.alerts].map((x) => [x.key, x.stub && find(x.stub[0], x.stub[1])])),
    };
    Object.entries(pick).forEach(([k, v]) => { if (v) cfg[k] = v; });
    return cfg;
  }

  setConfig(config) {
    if (!config) throw new Error("Invalid configuration");
    this._config = { ...config };
    this._built = false;
    this._ids = null;
    this._pend = {};
    this._mem = this._load();
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
  connectedCallback() { this._observe(); if (this._built) this._render(); }
  disconnectedCallback() { this._io?.disconnect(); this._io = null; clearInterval(this._tick); this._tick = null; }
  getCardSize() { return 5; }
  getGridOptions() { return { columns: 12, min_columns: 6, rows: "auto" }; }

  _t(k) { const L = TXT[lang(this._hass)] || TXT.en; return L[k] ?? TXT.en[k] ?? k; }
  _st(id) { return typeof id === "string" ? this._hass.states[id] : undefined; }
  _ok(s) { return !!s && !BAD.includes(String(s.state).toLowerCase()); }
  _num(id) {
    const s = this._st(id);
    if (!this._ok(s)) return null;
    const n = Number(s.state);
    return Number.isFinite(n) ? n : null;
  }
  _fmt(v, unit, dec = 0) {
    if (v == null) return "—";
    const n = Number(v).toLocaleString(this._hass?.locale?.language || undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
    return `${n}${unit ? (unit === "%" || unit.startsWith("°") ? "" : " ") + unit : ""}`;
  }
  _fs(s, state) {
    if (!s) return "";
    try { if (this._hass.formatEntityState) return this._hass.formatEntityState(s, state); } catch (e) { /* fall through */ }
    return pretty(state ?? s.state);
  }
  _active(id) { const s = this._st(id); return this._ok(s) && ACTIVE.includes(norm(s.state)); }
  // minutes left; accepts a timestamp (Home Connect), a duration with unit (Miele: min) or "h:mm[:ss]"
  _remaining(id) {
    const s = this._st(id);
    if (!this._ok(s)) return null;
    const st = String(s.state).trim();
    if (s.attributes.device_class === "timestamp" || /^\d{4}-\d\d-\d\dT/.test(st)) {
      const t = Date.parse(st);
      return Number.isFinite(t) ? Math.max(0, (t - Date.now()) / 60000) : null;
    }
    const hm = st.match(/^(\d+):(\d{2})(?::(\d{2}))?$/);
    if (hm) return Number(hm[1]) * 60 + Number(hm[2]) + (hm[3] ? Number(hm[3]) / 60 : 0);
    const n = Number(st);
    if (!Number.isFinite(n)) return null;
    const u = String(s.attributes.unit_of_measurement || "min").toLowerCase();
    return u === "s" || u.startsWith("sec") ? n / 60 : u === "h" || u.startsWith("hour") || u === "uur" ? n * 60 : u === "d" ? n * 1440 : n;
  }
  _dur(m) {
    m = Math.ceil(m);
    if (m < 60) return `${m} ${this._t("min")}`;
    return `${Math.floor(m / 60)} ${this._t("h")} ${String(m % 60).padStart(2, "0")} ${this._t("min")}`;
  }
  _hm(m) { m = Math.ceil(m); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`; }

  _mapState(s) {
    const c = this._config, raw = String(s.state), n = norm(raw);
    const custom = c.state_map && (c.state_map[raw] ?? c.state_map[n]);
    if (custom) return custom;
    const dom = s.entity_id?.split(".")[0] || (typeof c.state_entity === "string" ? c.state_entity.split(".")[0] : "");
    if (dom === "binary_sensor" || dom === "switch" || dom === "input_boolean") return n === "on" ? "running" : "idle";
    return Object.keys(STATE_MAP).find((k) => STATE_MAP[k].includes(n)) || (Number.isFinite(Number(raw)) ? null : "idle");
  }

  _resolve() {
    const c = this._config;
    const r = { status: "unavailable", alerts: [], cls: "" };
    const se = this._st(c.state_entity), ps = this._st(c.power_switch);
    const pw = this._num(c.power), thr = Number(c.power_threshold ?? 5);
    if (this._ok(se)) r.status = this._mapState(se) || "idle";
    else if (pw != null) r.status = pw > thr ? "running" : "idle";
    else if (this._ok(ps)) r.status = "idle";
    // a switched-off appliance reads "off", whatever the operation state still says
    const psOn = this._ok(ps) ? this._pv("power", ps.state === "on") : null;
    if (psOn === false && !["running", "paused", "delayed", "action", "error"].includes(r.status)) r.status = "off";
    r.psOn = psOn;
    if (r.status === "unavailable") return r;

    const door = this._st(c.door);
    r.door = this._ok(door) && (door.entity_id?.startsWith("binary_sensor.") || String(c.door).startsWith("binary_sensor.") ? door.state === "on" : ["open", "opened", "ajar", "on"].includes(norm(door.state)));
    const prog = this._st(c.program);
    r.prog = this._ok(prog) && !["off", "none", "no_program"].includes(norm(prog.state)) ? this._fs(prog) : null;
    const ph = this._st(c.phase);
    r.phase = this._ok(ph) && !["off", "none", "not_running"].includes(norm(ph.state)) ? this._fs(ph) : null;
    r.rem = LIVE.includes(r.status) ? this._remaining(c.remaining) : null;
    r.pct = this._num(c.progress);
    // without a progress sensor: the longest remaining time seen this run = 0 %
    if (LIVE.includes(r.status) && r.rem != null) {
      if (!this._mem.total || r.rem > this._mem.total) { this._mem.total = r.rem; this._save(); }
      if (r.pct == null && this._mem.total > 1) r.pct = Math.max(0, Math.min(100, 100 * (1 - r.rem / this._mem.total)));
    } else if (!LIVE.includes(r.status) && this._mem.total) { this._mem.total = 0; this._save(); }
    if (r.status === "finished") r.pct = 100;
    r.pw = pw;
    DEV.alerts.forEach((a) => { if (c[a.key] && this._active(c[a.key])) r.alerts.push(a.key); });
    const phaseTxt = `${ph?.state || ""} ${r.phase || ""}`;
    r.cls = r.status === "running" ? DEV.phases.filter((p) => p.re.test(phaseTxt)).map((p) => p.cls).join(" ") : "";
    return r;
  }

  _actions() {
    const c = this._config;
    return Object.keys(ACTS).filter((k) => (k === "power" ? c.power_switch : c[k] || (k === "pause" && c.resume)));
  }

  _build() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    const uid = `${DEV.key.slice(0, 2)}${Math.random().toString(36).slice(2, 8)}`;
    const acts = this._actions();
    this.shadowRoot.innerHTML = `
      <style>${STYLE}</style>
      <ha-card>
        <div class="wrap" id="wrap">
          <div class="top">
            <div class="illus" id="illus"><svg viewBox="0 0 120 140" aria-hidden="true">${DEV.svg.replace(/ID-/g, `${uid}-`)}</svg></div>
            <div class="head" id="head">
              <div class="name" id="name"></div>
              <div class="status"><span class="dot"></span><span class="txt" id="status"></span></div>
              <div class="alert" id="alert" hidden><ha-icon icon="mdi:alert-circle"></ha-icon><span id="alert-t"></span></div>
            </div>
            <div class="stats" id="stats"></div>
          </div>
          <div class="modes" id="modes" style="--n:${Math.max(1, acts.length)}">
            ${acts.map((k) => {
              const a = ACTS[k];
              return `<button class="mode ${a.light ? "light" : ""}" data-act="${k}" style="--mc:${a.color || "var(--ap-accent)"}">
                <ha-icon icon="${a.icon}"></ha-icon><span class="ml">${esc(this._t(a.lbl))}</span></button>`;
            }).join("")}
          </div>
          <div class="controls closed" id="controls"><div class="cin">
            <div class="crow" id="r-sel" hidden>
              <ha-icon icon="${DEV.programIcon}"></ha-icon><span class="tl">${this._t("program")}</span>
              <div class="sel"><select id="sel" aria-label="${this._t("program")}"></select><ha-icon icon="mdi:chevron-down"></ha-icon></div>
            </div>
            <div class="crow" id="r-prog" hidden>
              <ha-icon icon="mdi:progress-clock"></ha-icon><span class="tl" id="ph"></span>
              <div class="bar"><span id="bar"></span></div><span class="pv" id="pv"></span>
            </div>
          </div></div>
        </div>
      </ha-card>`;
    const $ = (id) => this.shadowRoot.getElementById(id);
    this._el = { wrap: $("wrap"), card: this.shadowRoot.querySelector("ha-card"), name: $("name"), status: $("status"), alert: $("alert"),
      alertT: $("alert-t"), stats: $("stats"), lcd: this.shadowRoot.querySelector(".lcd"), modes: $("modes"), controls: $("controls"),
      rSel: $("r-sel"), sel: $("sel"), rProg: $("r-prog"), ph: $("ph"), bar: $("bar"), pv: $("pv") };
    if (this._config.hide_buttons || !acts.length) $("modes").style.display = "none";
    $("modes").addEventListener("click", (ev) => {
      const el = ev.target.closest(".mode");
      if (!el) return;
      this._ripple(el, ev);
      this._press(el.dataset.act, el);
    });
    const more = () => this._moreInfo(this._config.state_entity || this._config.power || this._config.power_switch);
    $("illus").addEventListener("click", () => (this._config.tap_action ? this._runAction(this._config.tap_action) : more()));
    $("head").addEventListener("click", more);
    $("stats").addEventListener("click", (ev) => { const t = ev.target.closest("[data-entity]"); if (t) this._moreInfo(t.dataset.entity); });
    $("sel").addEventListener("change", (ev) => this._selectProgram(ev.target.value));
    this._built = true;
  }

  _render() {
    if (!this._built) this._build();
    const c = this._config, r = this._resolve(), E = this._el;
    this._r = r;
    E.wrap.className = `wrap s-${r.status} ${LIVE.includes(r.status) || r.status === "finished" ? "on" : ""} ${r.door ? "door-open" : ""} ${r.cls}`;
    E.card.classList.toggle("on", ["running", "delayed", "action", "finished"].includes(r.status));
    E.name.textContent = c.name || this._st(c.state_entity)?.attributes?.friendly_name || this._t("dev_name");

    // status line: state · program · phase · time left
    const parts = [];
    if (r.status !== "off" && r.status !== "unavailable" && r.prog && c.show_program !== false) parts.push(r.prog);
    if (r.status === "running" && r.phase) parts.push(r.phase);
    if (r.rem != null && LIVE.includes(r.status)) parts.push(this._t("left").replace("{d}", this._dur(r.rem)));
    if (r.door && !LIVE.includes(r.status)) parts.push(this._t("door_open"));
    E.status.textContent = this._busyLabel || [this._t(`s_${r.status}`), ...parts].join(" · ");
    E.alert.hidden = !r.alerts.length;
    E.alertT.textContent = r.alerts.map((a) => this._t(`a_${a}`)).join(" · ");

    if (E.lcd) {
      E.lcd.textContent = r.status === "unavailable" || r.status === "off" ? ""
        : r.status === "error" ? "Err"
        : r.status === "finished" ? "End"
        : r.rem != null && LIVE.includes(r.status) ? this._hm(r.rem)
        : r.pct != null && LIVE.includes(r.status) ? `${Math.round(r.pct)}%`
        : r.status === "running" ? "Run" : "--";
    }

    // tiles — unknown values are hidden, nothing that the status line already says
    const tiles = [];
    if (c.show_finish !== false && r.rem != null && LIVE.includes(r.status)) {
      const at = new Date(Date.now() + Math.ceil(r.rem) * 60000);
      tiles.push({ e: c.remaining, icon: "mdi:clock-check-outline", lbl: this._t("ready_at"), v: at.toLocaleTimeString(this._hass?.locale?.language || undefined, { hour: "2-digit", minute: "2-digit" }) });
    }
    if (r.status !== "off") DEV.tiles.forEach((d) => {
      const s = this._st(c[d.key]);
      if (!this._ok(s) || ["off", "none"].includes(norm(s.state))) return;
      const n = Number(s.state), u = s.attributes.unit_of_measurement;
      tiles.push({ e: c[d.key], icon: d.icon, lbl: this._t(d.key), v: esc(Number.isFinite(n) ? this._fmt(n, u, 0) : this._fs(s)) });
    });
    if (c.show_power !== false && r.pw != null && r.pw >= 1) tiles.push({ e: c.power, icon: "mdi:flash", lbl: this._t("power"), v: this._fmt(r.pw, this._st(c.power)?.attributes?.unit_of_measurement || "W", r.pw < 10 ? 1 : 0) });
    const en = this._num(c.energy);
    if (en != null) tiles.push({ e: c.energy, icon: "mdi:lightning-bolt-circle", lbl: this._t("energy"), v: this._fmt(en, this._st(c.energy)?.attributes?.unit_of_measurement || "kWh", en < 10 ? 2 : 1) });
    (c.tiles || []).forEach((t) => {
      const id = typeof t === "string" ? t : t.entity, s = this._st(id);
      if (!this._ok(s)) return;
      const n = Number(s.state), u = s.attributes.unit_of_measurement;
      tiles.push({ e: id, icon: t.icon || s.attributes.icon || "mdi:information-outline", lbl: t.name || s.attributes.friendly_name || id,
        v: esc(Number.isFinite(n) ? this._fmt(n, u, t.decimals ?? (Number.isInteger(n) ? 0 : 1)) : this._fs(s)) });
    });
    const th = tiles.map((t) => `<div class="tile" data-entity="${esc(t.e || "")}"><span class="val">${t.v}</span><span class="lbl"><ha-icon icon="${esc(t.icon)}"></ha-icon>${esc(t.lbl)}</span></div>`).join("");
    if (th !== this._tilesHtml) { E.stats.innerHTML = th; E.stats.className = `stats ${tiles.length === 3 ? "n3" : ""}`; this._tilesHtml = th; }

    // buttons: dim what can't be used right now instead of hiding it (no layout jumps)
    const st = r.status;
    this.shadowRoot.querySelectorAll(".mode").forEach((el) => {
      const k = el.dataset.act;
      let dim = st === "unavailable", active = false;
      if (k === "power") active = r.psOn === true;
      if (k === "start") { dim ||= ["running", "action"].includes(st); active = st === "running"; }
      if (k === "pause") {
        dim ||= !["running", "paused", "action"].includes(st); active = st === "paused";
        const res = st === "paused";
        el.querySelector("ha-icon").setAttribute("icon", res ? "mdi:play-pause" : ACTS.pause.icon);
        el.querySelector(".ml").textContent = this._t(res ? "resume" : "pause");
      }
      if (k === "stop") dim ||= !LIVE.includes(st);
      el.classList.toggle("dim", dim && !active && !el.classList.contains("busy"));
      el.classList.toggle("active", active);
    });

    // controls: program choice while idle, progress while running
    const ps = this._st(c.program), pdom = typeof c.program === "string" ? c.program.split(".")[0] : "";
    const showSel = this._ok(ps) && ["select", "input_select"].includes(pdom) && ["idle", "finished"].includes(st) && c.show_program_select !== false;
    E.rSel.hidden = !showSel;
    if (showSel) {
      const opts = ps.attributes.options || [];
      const sig = opts.join("|") + lang(this._hass);
      if (sig !== this._optSig) {
        E.sel.innerHTML = opts.map((o) => `<option value="${esc(o)}">${esc(this._fs(ps, o))}</option>`).join("");
        this._optSig = sig;
      }
      const v = this._pv("program", ps.state);
      E.sel.value = opts.includes(v) ? v : "";
      E.rSel.classList.toggle("pending", !!this._pend.program);
    }
    const showProg = ["running", "paused", "action", "delayed"].includes(st) && (r.pct != null || r.rem != null);
    E.rProg.hidden = !showProg;
    if (showProg) {
      E.ph.textContent = st === "running" && r.phase ? r.phase : this._t(st === "running" ? "progress" : `s_${st}`);
      E.bar.style.setProperty("--p", r.pct != null ? (r.pct / 100).toFixed(3) : 0);
      E.pv.textContent = r.pct != null ? `${Math.round(r.pct)}%` : this._hm(r.rem);
    }
    E.controls.classList.toggle("closed", !(showSel || showProg));

    // time-based values (finish timestamp) change without HA pushing anything: refresh every 30 s while running
    if (LIVE.includes(st) && !this._tick) this._tick = setInterval(() => this._render(), 30000);
    else if (!LIVE.includes(st) && this._tick) { clearInterval(this._tick); this._tick = null; }
  }

  _key() { const c = this._config; return `${DEV.tag}:${c.storage_key || c.state_entity || c.power || c.name || ""}`; }
  _load() { try { return JSON.parse(localStorage.getItem(this._key())) || {}; } catch (e) { return {}; } }
  _save() { try { localStorage.setItem(this._key(), JSON.stringify(this._mem)); } catch (e) { /* private mode */ } }
  _pv(k, actual) {
    const p = this._pend?.[k];
    if (!p) return actual;
    if (p.v === actual || Date.now() - p.at > 6000) { delete this._pend[k]; return actual; }
    return p.v;
  }

  _ripple(el, ev) {
    const r = el.getBoundingClientRect(), d = Math.max(r.width, r.height);
    const s = document.createElement("span");
    s.className = "ripple";
    s.style.cssText = `width:${d}px;height:${d}px;left:${(ev.clientX || r.left + r.width / 2) - r.left - d / 2}px;top:${(ev.clientY || r.top + r.height / 2) - r.top - d / 2}px`;
    el.appendChild(s);
    setTimeout(() => s.remove(), 650);
  }

  async _press(k, el) {
    if (!this._hass) return;
    const c = this._config, st = this._r?.status;
    if (k === "start" && st === "running") return;
    el.classList.add("busy");
    this._busyLabel = this._t("sending");
    this._render();
    try {
      if (k === "power") {
        const s = this._st(c.power_switch), next = !this._pv("power", s?.state === "on");
        this._pend.power = { v: next, at: Date.now() };
        if (typeof c.power_switch === "string") {
          const dom = c.power_switch.split(".")[0];
          await this._hass.callService(["switch", "input_boolean"].includes(dom) ? dom : "homeassistant", next ? "turn_on" : "turn_off", { entity_id: c.power_switch });
        }
      } else {
        const target = k === "pause" && st === "paused" ? c.resume || c.start || c.pause : c[k] || (k === "pause" ? c.resume : null);
        if (target) await this._call(target, k === "stop" ? "off" : "on");
      }
    } catch (e) {
      console.error(`${DEV.tag}:`, e);
      delete this._pend.power;
    } finally {
      setTimeout(() => { el.classList.remove("busy"); this._busyLabel = null; this._render(); }, 600);
      setTimeout(() => this._render(), 6100);
    }
  }

  // run a configured action: an entity (pressed according to its domain) or a full HA action object
  _call(t, dir) {
    if (t && typeof t === "object") return this._runAction(t);
    const id = String(t), dom = id.split(".")[0], call = (d, s, data) => this._hass.callService(d, s, data);
    if (dom === "script") return call("script", "turn_on", { entity_id: id });
    if (dom === "button" || dom === "input_button") return call(dom, "press", { entity_id: id });
    if (dom === "scene") return call("scene", "turn_on", { entity_id: id });
    if (dom === "automation") return call("automation", "trigger", { entity_id: id });
    if (dom === "select" || dom === "input_select") {
      // Home Connect: selecting the chosen program on the "active program" select starts it
      const opt = this._st(this._config.program)?.state;
      return opt && !BAD.includes(String(opt).toLowerCase()) ? call(dom, "select_option", { entity_id: id, option: opt }) : null;
    }
    if (dom === "switch" || dom === "input_boolean") return call(dom, dir === "off" ? "turn_off" : "turn_on", { entity_id: id });
    return call("homeassistant", "toggle", { entity_id: id });
  }

  async _selectProgram(v) {
    const id = this._config.program;
    if (!v || typeof id !== "string") return;
    this._pend.program = { v, at: Date.now() };
    this._render();
    try { await this._hass.callService(id.split(".")[0], "select_option", { entity_id: id, option: v }); }
    catch (e) { console.error(`${DEV.tag}:`, e); delete this._pend.program; this._render(); }
    setTimeout(() => this._render(), 6100);
  }

  async _runAction(a) {
    const type = a.action;
    if (type === "more-info") return this._moreInfo(a.entity || this._config.state_entity);
    if (type === "navigate") { history.pushState(null, "", a.navigation_path); window.dispatchEvent(new Event("location-changed")); return; }
    if (type === "url") { window.open(a.url_path, "_blank"); return; }
    let svc = a.perform_action || a.service || (type && type !== "perform-action" && type !== "call-service" ? type : null);
    if (!svc) return;
    let data = { ...(a.data || a.service_data || {}) };
    if (/^script\.[^.]+$/.test(svc) && !svc.startsWith("script.turn_")) {
      data = { entity_id: svc, ...(Object.keys(data).length ? { variables: data } : {}) };
      svc = "script.turn_on";
    }
    const [d, s] = svc.split(".");
    return this._hass.callService(d, s, data, a.target);
  }

  _moreInfo(entityId) {
    if (!entityId || typeof entityId !== "string") return;
    this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId }, bubbles: true, composed: true }));
  }
}

// ======================================================================
// Visual editor
// ======================================================================
const ED_TXT = {
  en: {
    name: "Name", state_entity: "Operation state (sensor)", power_switch: "Power switch", program: "Program (select or sensor)", phase: "Program phase (optional)",
    remaining: "Remaining time or finish time", progress: "Progress (%)", door: "Door",
    start: "Start", pause: "Pause", resume: "Resume (optional)", stop: "Stop",
    power: "Power sensor (W)", power_threshold: "Running above (W)", energy: "Energy sensor (optional)",
    show_power: "Show power tile", show_finish: "Show finish-time tile", show_program_select: "Program choice in the card", hide_buttons: "Hide buttons",
    sec_main: "Appliance", sec_progress: "Progress", sec_actions: "Buttons", sec_sensors: "Sensors", sec_alerts: "Warnings", sec_layout: "Layout",
    main_hint: "Home Connect, Miele, LG, Samsung… use the operation-state sensor. Only a smart plug? Leave it empty and set the power sensor below.",
    actions_hint: "A button, script, scene or switch per action; empty = no button. A select (Home Connect “active program”) starts the chosen program.",
    power_hint: "Without an operation state, the power decides whether the appliance is running.",
    yaml_action: "One or more buttons use a custom action from YAML — edit those in the code editor.",
  },
  nl: {
    name: "Naam", state_entity: "Bedrijfstoestand (sensor)", power_switch: "Aan/uit-schakelaar", program: "Programma (select of sensor)", phase: "Programmafase (optioneel)",
    remaining: "Resterende tijd of eindtijd", progress: "Voortgang (%)", door: "Deur",
    start: "Start", pause: "Pauze", resume: "Hervatten (optioneel)", stop: "Stop",
    power: "Vermogen-sensor (W)", power_threshold: "Bezig boven (W)", energy: "Energie-sensor (optioneel)",
    show_power: "Vermogen-tegel tonen", show_finish: "Eindtijd-tegel tonen", show_program_select: "Programmakeuze in de kaart", hide_buttons: "Knoppen verbergen",
    sec_main: "Apparaat", sec_progress: "Voortgang", sec_actions: "Knoppen", sec_sensors: "Sensoren", sec_alerts: "Meldingen", sec_layout: "Weergave",
    main_hint: "Home Connect, Miele, LG, Samsung… gebruik de bedrijfstoestand-sensor. Alleen een slimme stekker? Laat die leeg en kies hieronder de vermogen-sensor.",
    actions_hint: "Een knop, script, scène of schakelaar per actie; leeg = geen knop. Een select (Home Connect ‘actief programma’) start het gekozen programma.",
    power_hint: "Zonder bedrijfstoestand bepaalt het vermogen of het apparaat bezig is.",
    yaml_action: "Een of meer knoppen gebruiken een eigen actie uit YAML — pas die aan in de code-editor.",
  },
};
const ED_STYLE = `
.section { margin-top: 20px; }
.section h3 { margin: 0 0 8px; font-size: 15px; font-weight: 500; color: var(--primary-text-color); }
.hint { font-size: 12px; color: var(--secondary-text-color); margin: 0 0 10px; }
.note { font-size: 12px; color: var(--secondary-text-color); margin: 2px 0 6px; }
.note[hidden] { display: none; }
`;
const RUN = ["button", "input_button", "script", "scene", "switch", "input_boolean", "automation", "select"];

class Editor extends HTMLElement {
  setConfig(config) { this._config = { ...config }; this._render(); }
  set hass(hass) {
    this._hass = hass;
    this.shadowRoot?.querySelectorAll("ha-form").forEach((f) => (f.hass = hass));
    if (!this._built) this._render();
  }
  _t(k) {
    const L = lang(this._hass);
    return (ED_TXT[L] || ED_TXT.en)[k] ?? ED_TXT.en[k] ?? (TXT[L] || TXT.en)[k] ?? TXT.en[k] ?? k;
  }

  _schemas() {
    const ent = (domain, extra = {}) => ({ entity: { domain, ...extra } });
    const anyKey = (x) => ({ name: x.key, selector: ent(x.domains || ["sensor", "select", "input_select", "binary_sensor"]) });
    return {
      main: [
        { name: "name", selector: { text: {} } },
        { name: "state_entity", selector: ent(["sensor", "select", "binary_sensor", "input_select"]) },
        { name: "program", selector: ent(["select", "input_select", "sensor"]) },
        { name: "phase", selector: ent(["sensor"]) },
      ],
      progress: [
        { name: "remaining", selector: ent(["sensor"]) },
        { name: "progress", selector: ent(["sensor"]) },
        { name: "door", selector: ent(["binary_sensor", "sensor"]) },
      ],
      actions: [
        { name: "power_switch", selector: ent(["switch", "input_boolean"]) },
        { type: "grid", name: "", schema: ["start", "stop", "pause", "resume"].map((name) => ({ name, selector: ent(RUN) })) },
      ],
      sensors: [
        { type: "grid", name: "", schema: [
          { name: "power", selector: ent(["sensor"], { device_class: "power" }) },
          { name: "power_threshold", selector: { number: { min: 0, max: 500, step: 1, mode: "box", unit_of_measurement: "W" } } },
        ] },
        { name: "energy", selector: ent(["sensor"], { device_class: "energy" }) },
        ...DEV.tiles.map(anyKey),
      ],
      alerts: DEV.alerts.map((a) => ({ name: a.key, selector: ent(["binary_sensor", "sensor"]) })),
      layout: [
        { name: "show_finish", selector: { boolean: {} } },
        { name: "show_power", selector: { boolean: {} } },
        { name: "show_program_select", selector: { boolean: {} } },
        { name: "hide_buttons", selector: { boolean: {} } },
      ],
    };
  }
  static get FLAGS() { return ["show_finish", "show_power", "show_program_select"]; }

  _render() {
    if (!this._config) return;
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    if (this._built) { this._update(); return; }
    this._built = true;
    const sch = this._schemas();
    const sec = (id, hint = "", extra = "") => `<div class="section"${id === "main" ? ' style="margin-top:0"' : ""}><h3>${this._t(`sec_${id}`)}</h3>${hint ? `<p class="hint">${hint}</p>` : ""}${extra}<div id="f-${id}"></div></div>`;
    const ids = ["main", "progress", "actions", "sensors", ...(DEV.alerts.length ? ["alerts"] : []), "layout"];
    this.shadowRoot.innerHTML = `<style>${ED_STYLE}</style>
      ${sec("main", this._t("main_hint"))}
      ${sec("progress")}
      ${sec("actions", this._t("actions_hint"), `<p class="note" id="yaml-note" hidden>${this._t("yaml_action")}</p>`)}
      ${sec("sensors", this._t("power_hint"))}
      ${DEV.alerts.length ? sec("alerts") : ""}
      ${sec("layout")}`;
    this._keys = {};
    this._forms = {};
    ids.forEach((id) => {
      const f = document.createElement("ha-form");
      f.hass = this._hass; f.schema = sch[id]; f.data = {};
      f.computeLabel = (s) => this._t(s.name);
      this._keys[id] = sch[id].flatMap((x) => (x.type === "grid" ? x.schema : [x])).map((x) => x.name);
      f.addEventListener("value-changed", (ev) => { ev.stopPropagation(); this._patch(ev.detail.value, this._keys[id]); });
      this.shadowRoot.getElementById(`f-${id}`).appendChild(f);
      this._forms[id] = f;
    });
    this._update();
  }

  _update() {
    const c = this._config;
    Object.entries(this._forms).forEach(([id, f]) => {
      const d = {};
      this._keys[id].forEach((k) => {
        if (Editor.FLAGS.includes(k)) d[k] = c[k] !== false;
        else if (k === "hide_buttons") d[k] = !!c[k];
        else d[k] = c[k] && typeof c[k] === "object" ? undefined : c[k];   // YAML-only action objects stay out of the form
      });
      f.data = d;
    });
    const note = this.shadowRoot.getElementById("yaml-note");
    if (note) note.hidden = !["start", "stop", "pause", "resume"].some((k) => c[k] && typeof c[k] === "object");
  }

  _patch(v, keys) {
    const c = { ...this._config };
    keys.forEach((k) => {
      let val = v[k];
      if (c[k] && typeof c[k] === "object" && val == null) return;   // keep YAML-only values untouched
      if (Editor.FLAGS.includes(k)) val = val === false ? false : undefined;
      if (k === "hide_buttons") val = val ? true : undefined;
      if (k === "power_threshold" && Number(val) === 5) val = undefined;
      if (val === "" || val == null) delete c[k]; else c[k] = val;
    });
    const { type, ...rest } = c;
    this._config = { type, ...rest };
    this._update();
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
  }
}

customElements.define(`${DEV.tag}-editor`, Editor);
customElements.define(DEV.tag, Card);
window.customCards = window.customCards || [];
window.customCards.push({ type: DEV.tag, name: DEV.title, description: DEV.description, preview: true });
console.info(`%c ${DEV.tag.toUpperCase()} %c ${DEV.version} `, `color:#fff;background:${DEV.accent};font-weight:700`, `color:${DEV.accent}`);
