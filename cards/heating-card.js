/*
 * heating-card — animated central-heating / thermostat card for Home Assistant
 * Made for Toon (Eneco), works with any climate entity + optional boiler sensors.
 * Same design language as aircon-card.
 */
const HC_VERSION = "1.1.0";

const PRESETS = {
  comfort: { icon: "mdi:sofa", color: "#ff8a3d" },
  home: { icon: "mdi:home", color: "#ffb74d" },
  sleep: { icon: "mdi:weather-night", color: "#8c9eff" },
  away: { icon: "mdi:home-export-outline", color: "#90a4ae" },
  eco: { icon: "mdi:leaf", color: "#66bb6a" },
  boost: { icon: "mdi:rocket-launch", color: "#ef5350" },
  activity: { icon: "mdi:run", color: "#ffa726" },
  none: { icon: "mdi:hand-back-right", color: "#9aa3ad" },
};
const PRESET_ORDER = ["comfort", "home", "sleep", "away", "eco", "boost", "activity", "none"];

const INDICATORS = {
  burner: { icon: "mdi:fire", color: "#ff7043" },
  heating: { icon: "mdi:radiator", color: "#ff8a3d" },
  hot_water: { icon: "mdi:faucet", color: "#29b6f6" },
  preheating: { icon: "mdi:thermometer-chevron-up", color: "#ffb74d" },
  opentherm: { icon: "mdi:lan-connect", problem: true },
  boiler_status: { icon: "mdi:check-circle-outline", problem: true },
};

const HTXT = {
  en: {
    comfort: "Comfort", home: "Home", sleep: "Sleep", away: "Away", eco: "Eco", boost: "Boost", activity: "Activity", none: "Manual",
    s_heating: "Heating", s_hot_water: "Hot water", s_preheating: "Preheating", s_idle: "At temperature", s_off: "Off",
    s_holiday: "Holiday mode", s_unavailable: "Unavailable", sending: "Sending…",
    room: "Room", humidity: "Humidity", modulation: "Modulation", target: "Target", program: "Program", holiday: "Holiday mode",
    override: "Temporarily changed",
    burner: "Burner", heating: "Heating", hot_water: "Hot water", preheating: "Preheating", opentherm: "OpenTherm", boiler_status: "Status",
    ok: "OK", problem: "Problem", on: "On", off: "Off",
    a_opentherm: "No connection with the boiler (OpenTherm)", a_boiler_status: "Boiler reports a fault",
  },
  nl: {
    comfort: "Comfort", home: "Thuis", sleep: "Slapen", away: "Weg", eco: "Eco", boost: "Boost", activity: "Actief", none: "Handmatig",
    s_heating: "Aan het verwarmen", s_hot_water: "Warm water", s_preheating: "Voorverwarmen", s_idle: "Op temperatuur", s_off: "Uit",
    s_holiday: "Vakantiemodus", s_unavailable: "Niet beschikbaar", sending: "Versturen…",
    room: "Kamer", humidity: "Vochtigheid", modulation: "Modulatie", target: "Doel", program: "Programma", holiday: "Vakantiemodus",
    override: "Tijdelijk aangepast",
    burner: "Brander", heating: "CV", hot_water: "Warm water", preheating: "Voorverwarmen", opentherm: "OpenTherm", boiler_status: "Status",
    ok: "OK", problem: "Probleem", on: "Aan", off: "Uit",
    a_opentherm: "Geen verbinding met de ketel (OpenTherm)", a_boiler_status: "Ketel meldt een storing",
  },
};
const HBAD = ["unavailable", "unknown", "none", ""];
const hesc = (v) => String(v ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
const hLang = (hass) => String(hass?.locale?.language || hass?.language || "en").slice(0, 2);

const SVG_BOILER = `
<defs>
<linearGradient id="ID-body" x1="0" x2="1"><stop offset="0" stop-color="#e9edf1"/><stop offset=".45" stop-color="#ffffff"/><stop offset="1" stop-color="#cfd5db"/></linearGradient>
<linearGradient id="ID-chrome" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbfcfd"/><stop offset=".3" stop-color="#a3abb4"/><stop offset=".55" stop-color="#eef1f4"/><stop offset=".8" stop-color="#8d959f"/><stop offset="1" stop-color="#c9ced4"/></linearGradient>
<radialGradient id="ID-glass" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#2a3138"/><stop offset="1" stop-color="#0d1014"/></radialGradient>
<radialGradient id="ID-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff9a4a" stop-opacity=".7"/><stop offset=".6" stop-color="#ff7a2e" stop-opacity=".2"/><stop offset="1" stop-color="#ff7a2e" stop-opacity="0"/></radialGradient>
<linearGradient id="ID-flame" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff5a1f"/><stop offset=".55" stop-color="#ff9a2e"/><stop offset="1" stop-color="#ffd54a"/></linearGradient>
<linearGradient id="ID-gloss" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
<clipPath id="ID-win"><circle cx="60" cy="56" r="13"/></clipPath>
</defs>
<ellipse class="bo-wall" cx="60" cy="56" rx="56" ry="50" fill="url(#ID-glow)"/>
<g class="bo-puffs" fill="#cfd6dd"><circle cx="60" cy="-1" r="3"/><circle cx="57" cy="-1" r="2.4"/><circle cx="63" cy="-1" r="2.6"/></g>
<rect x="53" y="2" width="14" height="10" rx="1.5" fill="url(#ID-chrome)" stroke="#9aa3ad" stroke-width=".5"/>
<g class="pipes" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <path class="p-base" d="M37 94v28H4M46 94v32H4M60 94v40M74 94v26h24v6M84 94v32h32"/>
  <path class="p-cv" d="M37 94v28H4M4 126h42V94"/>
  <path class="p-dhw" d="M74 94v26h24v6"/>
</g>
<path d="M60 128h-3v6h6v-6z" fill="#e4c24a" opacity=".85"/>
<rect x="94" y="124" width="8" height="5" rx="1.2" fill="url(#ID-chrome)" stroke="#8d959f" stroke-width=".4"/>
<g class="bo-drops" fill="#4fc3f7"><circle cx="98" cy="131" r="1.2"/><circle cx="98" cy="131" r="1.2"/><circle cx="98" cy="131" r="1.2"/></g>
<rect x="26" y="10" width="68" height="86" rx="8" fill="url(#ID-body)" stroke="#aab2ba" stroke-width=".7"/>
<path d="M30 28h60" stroke="#d7dce1" stroke-width=".6"/>
<path d="M30 84h60" stroke="#d7dce1" stroke-width=".6"/>
<path d="M34 88h52M34 90.5h52" stroke="#dde1e5" stroke-width=".5"/>
<rect x="43" y="14" width="34" height="11" rx="2.2" fill="#0c1720" opacity=".92"/>
<text class="lcd" x="60" y="19.8" text-anchor="middle"></text>
<circle class="led led-pwr" cx="34" cy="19.5" r="1.2"/>
<circle class="led led-err" cx="86" cy="19.5" r="1.2"/>
<circle class="bo-ring" cx="60" cy="56" r="18" fill="url(#ID-chrome)"/>
<circle cx="60" cy="56" r="14.5" fill="url(#ID-glass)"/>
<circle class="bo-inner" cx="60" cy="56" r="13" fill="url(#ID-glow)"/>
<g clip-path="url(#ID-win)">
  <g class="bo-size"><g class="bo-flame">
    <path d="M60 41c6 7 9 13 8 18.5c-.9 5-5 7.5-8 7.5s-7.1-2.5-8-7.5c-1-5.5 2-11.5 8-18.5z" fill="url(#ID-flame)"/>
    <path class="bo-core" d="M60 50.5c3 4 4.3 7.5 3.8 10.3c-.4 2.4-2.1 3.7-3.8 3.7s-3.4-1.3-3.8-3.7c-.5-2.8.8-6.3 3.8-10.3z" fill="#fff3b0"/>
  </g></g>
  <g class="bo-pilot"><ellipse cx="60" cy="67.5" rx="6" ry="1.6" fill="#4fc3f7" opacity=".85"/></g>
  <path d="M46 67h28" stroke="#3a424b" stroke-width="2"/>
</g>
<path d="M50.5 47a13 13 0 0 1 9-4.4" stroke="#fff" stroke-opacity=".5" stroke-width="1.6" fill="none" stroke-linecap="round"/>
<circle cx="60" cy="56" r="14.5" fill="url(#ID-gloss)" opacity=".5"/>
<g class="bo-holiday" transform="translate(60 56)"><rect x="-7" y="-4" width="14" height="10" rx="2" fill="#90a4ae"/><path d="M-3 -4v-2.2h6v2.2" fill="none" stroke="#90a4ae" stroke-width="1.4"/></g>`;

const HSTYLE = `
:host {
  --hc-heat: var(--state-climate-heat-color, #ff8a3d);
  --hc-water: #29b6f6;
  --hc-off: var(--disabled-text-color, #9aa3ad);
  --hc-alert: var(--error-color, #db4437);
  display: block; height: 100%;
}
:host([paused]) *, :host([paused]) *::before, :host([paused]) *::after { animation-play-state: paused !important; }
ha-card { height: 100%; overflow: hidden; container-type: inline-size; position: relative; }
ha-card::before {
  content: ""; position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 1s, background 1s;
  background: radial-gradient(120% 90% at 0% 0%, color-mix(in srgb, var(--c) 18%, transparent), transparent 60%);
}
ha-card.on::before { opacity: 1; }
.wrap { --c: var(--hc-off); padding: 14px; display: flex; flex-direction: column; gap: 12px; position: relative; }
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
  --mc: var(--hc-off);
  position: relative; overflow: hidden; border: none; border-radius: 12px; padding: 9px 4px 8px; cursor: pointer; font: inherit;
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  color: var(--secondary-text-color); background: rgba(127,127,127,.10);
  transition: background .3s, color .3s, transform .15s, box-shadow .3s;
}
.mode ha-icon { --mdc-icon-size: 22px; color: var(--mc); transition: color .3s, transform .4s; }
.mode .ml { font-size: 12px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.mode:hover { background: rgba(127,127,127,.17); }
.mode:active { transform: scale(.96); }
.mode:focus-visible { outline: 2px solid var(--mc); outline-offset: 2px; }
.mode.active { color: var(--mt); background: var(--mc); box-shadow: 0 4px 14px -4px color-mix(in srgb, var(--mc) 70%, transparent); }
.mode.active ha-icon { color: var(--mt); }
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
.target .tv { font-size: 16px; font-weight: 600; min-width: 52px; text-align: center; color: var(--primary-text-color); font-variant-numeric: tabular-nums; }
.target button { width: 32px; height: 32px; border-radius: 50%; border: none; cursor: pointer; display: grid; place-items: center; color: var(--primary-text-color); background: rgba(127,127,127,.18); }
.target button:hover { background: color-mix(in srgb, var(--c) 35%, transparent); }
.target button ha-icon { --mdc-icon-size: 18px; }
.target.pending .tv { color: var(--c); }


@keyframes glow { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
@keyframes pulse { 0% { transform: scale(1); opacity: .55; } 100% { transform: scale(2.8); opacity: 0; } }
@keyframes sweep { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
@keyframes ripple { to { transform: scale(2.6); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; } }
@container (max-width: 460px) { .modes[style*="--n:5"] .ml, .modes[style*="--n:6"] .ml { font-size: 11px; } }
@container (max-width: 340px) {
  .illus { width: var(--aircon-illustration-size-small, 84px); grid-row: auto; }
  .stats { grid-column: 1 / -1; }
  .mode .ml { font-size: 11px; }
}

.wrap { --c: var(--hc-off); }
.wrap.s-heating, .wrap.s-preheating { --c: var(--hc-heat); }
.wrap.s-hot_water { --c: var(--hc-water); }
.wrap.s-idle { --c: var(--pc, var(--hc-heat)); }
.wrap.s-holiday { --c: #64b5f6; }
.alert { display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; color: var(--hc-alert); }
.alert ha-icon { --mdc-icon-size: 15px; flex: none; }
.alert[hidden] { display: none; }
.stats.n3 { grid-template-columns: repeat(3, minmax(0,1fr)); }
.mode { --mt: #fff; }
.mode.light { --mt: #2a1a05; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chips:empty { display: none; }
.chip {
  --ic: var(--hc-off);
  display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px 5px 7px; border-radius: 14px; cursor: pointer;
  font-size: 12px; color: var(--secondary-text-color); background: rgba(127,127,127,.09); transition: background .3s, color .3s;
}
.chip ha-icon { --mdc-icon-size: 15px; color: var(--ic); opacity: .55; transition: opacity .3s, color .3s; }
.chip .cd { width: 6px; height: 6px; border-radius: 50%; background: rgba(127,127,127,.45); transition: background .3s; }
.chip.lit { color: var(--primary-text-color); background: color-mix(in srgb, var(--ic) 16%, transparent); }
.chip.lit ha-icon { opacity: 1; }
.chip .cd { position: relative; }
.chip.lit .cd { background: var(--ic); }
.chip.lit .cd::after { content: ""; position: absolute; inset: 0; border-radius: 50%; background: var(--ic); animation: pulse 1.8s ease-out infinite; }
.chip.ok { --ic: #3ddc84; } .chip.ok ha-icon { opacity: .9; } .chip.ok .cd { background: #3ddc84; }
.chip.bad { --ic: var(--hc-alert); color: var(--hc-alert); background: color-mix(in srgb, var(--hc-alert) 14%, transparent); }
.chip.bad ha-icon { opacity: 1; } .chip.bad .cd { background: var(--hc-alert); animation: blink 1s steps(2, start) infinite; }
.badge { font-size: 10.5px; font-weight: 600; padding: 2px 7px; border-radius: 9px; margin-left: 6px; color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); }
.badge[hidden] { display: none; }
.holiday-on .modes { opacity: .45; }

/* ---- illustration ---- */
.lcd { font: 700 8.5px ui-monospace, "Courier New", monospace; dominant-baseline: central; fill: #5c6a76; transition: fill .4s; }
.on .lcd { fill: var(--c); }
.has-err .lcd { fill: var(--hc-alert); }
.led { fill: #5a636d; transition: fill .3s; }
.led-pwr { fill: #3ddc84; } .s-off .led-pwr, .s-unavailable .led-pwr { fill: #5a636d; }
.has-err .led-err { fill: var(--hc-alert); animation: blink 1s steps(2, start) infinite; }
.bo-size { transform-box: view-box; transform-origin: 60px 67px; transform: scale(var(--flame, 0)); transition: transform 1.2s cubic-bezier(.3,1.3,.5,1); }
.bo-flame { transform-box: view-box; transform-origin: 60px 67px; }
.burn .bo-flame { animation: flicker .9s ease-in-out infinite alternate; }
.burn .bo-core { animation: core 1.3s ease-in-out infinite alternate; }
.bo-pilot { opacity: 0; transition: opacity .6s; }
.burn .bo-pilot, .s-preheating .bo-pilot { opacity: 1; }
.bo-inner, .bo-wall { opacity: 0; transition: opacity 1.2s; }
.burn .bo-inner { opacity: .9; animation: glow 2.4s ease-in-out infinite; }
.s-heating .bo-wall { opacity: .55; animation: glow 3.2s ease-in-out infinite; }
.s-preheating .bo-inner { opacity: .5; animation: glow 1.6s ease-in-out infinite; }
.bo-puffs circle { opacity: 0; transform-box: fill-box; transform-origin: center; }
.burn .bo-puffs circle { animation: puff 2.4s ease-out infinite; }
.bo-puffs circle:nth-child(2) { animation-delay: .8s; } .bo-puffs circle:nth-child(3) { animation-delay: 1.6s; }
.p-base { stroke: #b8c0c8; stroke-width: 3.4; }
.p-cv, .p-dhw { stroke-width: 1.6; stroke-dasharray: 3 5; opacity: 0; transition: opacity .8s; }
.p-cv { stroke: var(--hc-heat); } .p-dhw { stroke: var(--hc-water); }
.s-heating .p-cv, .heat-on .p-cv { opacity: 1; animation: flow .9s linear infinite; }
.s-hot_water .p-dhw { opacity: 1; animation: flow .7s linear infinite; }
.bo-drops circle { opacity: 0; }
.s-hot_water .bo-drops circle { animation: drip 1.2s ease-in infinite; }
.bo-drops circle:nth-child(2) { animation-delay: .4s; } .bo-drops circle:nth-child(3) { animation-delay: .8s; }
.bo-holiday { opacity: 0; transition: opacity .5s; }
.s-holiday:not(.burn) .bo-holiday { opacity: .9; }
@keyframes flicker { 0% { transform: scale(1, 1) skewX(0); } 35% { transform: scale(.94, 1.06) skewX(-2deg); } 70% { transform: scale(1.04, .95) skewX(2deg); } 100% { transform: scale(.97, 1.03) skewX(-1deg); } }
@keyframes core { from { opacity: .75; } to { opacity: 1; } }
@keyframes puff { 0% { opacity: 0; transform: translateY(0) scale(.6); } 25% { opacity: .7; } 100% { opacity: 0; transform: translateY(-12px) scale(1.6); } }
@keyframes flow { to { stroke-dashoffset: -16; } }
@keyframes drip { 0% { opacity: 0; transform: translateY(0); } 20% { opacity: .9; } 100% { opacity: 0; transform: translateY(9px); } }
@keyframes blink { to { visibility: hidden; } }
`;

class HeatingCard extends HTMLElement {
  static async getConfigElement() {
    if (!customElements.get("ha-form") || !customElements.get("ha-entity-picker")) {
      try {
        const helpers = await window.loadCardHelpers?.();
        const tile = await helpers?.createCardElement({ type: "tile", entity: "sun.sun" });
        await tile?.constructor?.getConfigElement?.();
      } catch (e) { /* ignore */ }
    }
    return document.createElement("heating-card-editor");
  }

  // best-effort pre-fill for Toon entities
  static getStubConfig(hass) {
    const ids = Object.keys(hass?.states || {});
    const find = (dom, re) => ids.find((e) => e.startsWith(`${dom}.`) && re.test(e));
    const clim = find("climate", /toon|thermostat/) || find("climate", /./);
    const cfg = { name: "Verwarming", entity: clim };
    const pick = {
      program: find("switch", /thermostat_program|program/), holiday: find("switch", /holiday/),
      program_override: find("binary_sensor", /program_override/),
      temperature: find("sensor", /toon.*temperature|thermostat.*temperature/), humidity: find("sensor", /toon.*humidity|thermostat.*humidity/),
      modulation: find("sensor", /modulation/), burner: find("binary_sensor", /burner/), heating: find("binary_sensor", /boiler.*heating|_heating$/),
      hot_water: find("binary_sensor", /hot_tap_water|tap_water|hot_water/), preheating: find("binary_sensor", /preheat/),
      opentherm: find("binary_sensor", /opentherm/), boiler_status: find("binary_sensor", /boiler_status|toon.*status|_status$/),
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
  getCardSize() { return 5; }
  getGridOptions() { return { columns: 12, min_columns: 6, rows: "auto" }; }

  _t(k) { return (HTXT[hLang(this._hass)] || HTXT.en)[k] ?? HTXT.en[k] ?? k; }
  _st(id) { return id ? this._hass.states[id] : undefined; }
  _num(id) {
    const s = this._st(id);
    if (!s || HBAD.includes(String(s.state).toLowerCase())) return null;
    const n = Number(s.state);
    return Number.isFinite(n) ? n : null;
  }
  _fmt(v, unit, dec = 1) {
    if (v == null) return "—";
    const n = Number(v).toLocaleString(this._hass?.locale?.language || undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
    return `${n}${unit ? (unit === "%" || unit.startsWith("°") ? "" : " ") + unit : ""}`;
  }
  _on(id) { const s = this._st(id); return !!s && s.state === "on"; }
  _problem(id) {
    const s = this._st(id);
    if (!s || HBAD.includes(String(s.state).toLowerCase())) return false;
    return s.attributes.device_class === "connectivity" ? s.state === "off" : s.state === "on";
  }
  _buttons() {
    const c = this._config;
    if (Array.isArray(c.buttons) && c.buttons.length) return c.buttons.map((b) => (typeof b === "string" ? { preset: b } : b));
    const clim = this._st(c.entity);
    const pm = clim?.attributes?.preset_modes || ["comfort", "home", "sleep", "away"];
    return [...PRESET_ORDER.filter((p) => pm.includes(p)), ...pm.filter((p) => !PRESET_ORDER.includes(p))].filter((p) => p !== "none").map((preset) => ({ preset }));
  }

  _resolve() {
    const c = this._config, clim = this._st(c.entity);
    const r = { clim, status: "idle", burn: false, errors: [] };
    const st = clim ? String(clim.state).toLowerCase() : "";
    if (!clim || HBAD.includes(st)) { r.status = "unavailable"; return r; }
    const act = String(clim.attributes.hvac_action || "").toLowerCase();
    const burner = c.burner ? this._on(c.burner) : act === "heating";
    const hot = this._on(c.hot_water), heat = c.heating ? this._on(c.heating) : act === "heating", pre = this._on(c.preheating);
    r.burn = burner;
    r.heatOn = heat;
    if (st === "off") r.status = "off";
    else if (this._on(c.holiday)) r.status = "holiday";
    else if (hot && (burner || !c.burner)) r.status = "hot_water";
    else if (heat || act === "heating") r.status = "heating";
    else if (pre) r.status = "preheating";
    else r.status = "idle";
    if (c.opentherm && this._problem(c.opentherm)) r.errors.push("opentherm");
    if (c.boiler_status && this._problem(c.boiler_status)) r.errors.push("boiler_status");
    r.mod = this._num(c.modulation);
    r.preset = this._pv("preset", clim.attributes.preset_mode);
    return r;
  }

  _build() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    const uid = `hc${Math.random().toString(36).slice(2, 8)}`;
    const btns = this._buttons();
    const cols = this._config.columns || Math.min(btns.length, 5);
    this.shadowRoot.innerHTML = `
      <style>${HSTYLE}</style>
      <ha-card>
        <div class="wrap" id="wrap">
          <div class="top">
            <div class="illus" id="illus"><svg viewBox="0 0 120 140" aria-hidden="true">${SVG_BOILER.replace(/ID-/g, `${uid}-`)}</svg></div>
            <div class="head" id="head">
              <div class="name" id="name"></div>
              <div class="status"><span class="dot"></span><span class="txt" id="status"></span></div>
              <div class="alert" id="alert" hidden><ha-icon icon="mdi:alert-circle"></ha-icon><span id="alert-t"></span></div>
            </div>
            <div class="stats" id="stats"></div>
          </div>
          <div class="chips" id="chips"></div>
          <div class="modes" id="modes" style="--n:${cols}">
            ${btns.map((b, i) => {
              const p = PRESETS[b.preset] || {};
              const col = b.color || p.color || "#9aa3ad";
              const light = ["#ffb74d", "#ffa726", "#8c9eff", "#90a4ae"].includes(col.toLowerCase());
              return `<button class="mode ${light ? "light" : ""}" data-i="${i}" data-preset="${hesc(b.preset || "")}" style="--mc:${hesc(col)}" title="${hesc(b.name || this._t(b.preset))}">
                <ha-icon icon="${hesc(b.icon || p.icon || "mdi:gesture-tap")}"></ha-icon>
                <span class="ml">${hesc(b.name || (b.preset ? this._t(b.preset) : ""))}</span>
              </button>`;
            }).join("")}
          </div>
          <div class="controls closed" id="controls"><div class="cin">
            <div class="crow target" id="target" hidden>
              <ha-icon icon="mdi:thermometer"></ha-icon>
              <span class="tl">${this._t("target")}</span>
              <button id="minus" aria-label="-"><ha-icon icon="mdi:minus"></ha-icon></button>
              <span class="tv" id="tv"></span>
              <button id="plus" aria-label="+"><ha-icon icon="mdi:plus"></ha-icon></button>
            </div>
            <div class="crow toggle" id="r-program" hidden>
              <ha-icon icon="mdi:calendar-clock"></ha-icon><span class="tl">${this._t("program")}<span class="badge" id="override" hidden>${this._t("override")}</span></span>
              <button class="sw" id="sw-program" role="switch" aria-checked="false" aria-label="${this._t("program")}"><span></span></button>
            </div>
            <div class="crow toggle" id="r-holiday" hidden>
              <ha-icon icon="mdi:airplane-takeoff"></ha-icon><span class="tl">${this._t("holiday")}</span>
              <button class="sw" id="sw-holiday" role="switch" aria-checked="false" aria-label="${this._t("holiday")}"><span></span></button>
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
    const more = () => this._moreInfo(this._config.entity);
    $("illus").addEventListener("click", () => (this._config.tap_action ? this._runAction(this._config.tap_action) : more()));
    $("head").addEventListener("click", more);
    $("stats").addEventListener("click", (ev) => { const t = ev.target.closest("[data-entity]"); if (t) this._moreInfo(t.dataset.entity); });
    $("chips").addEventListener("click", (ev) => { const t = ev.target.closest("[data-entity]"); if (t) this._moreInfo(t.dataset.entity); });
    $("minus").addEventListener("click", () => this._nudge(-1));
    $("plus").addEventListener("click", () => this._nudge(1));
    ["program", "holiday"].forEach((k) => $(`r-${k}`).addEventListener("click", (ev) => { ev.preventDefault(); this._toggleSw(k); }));
    this._built = true;
  }

  _render() {
    if (!this._built) this._build();
    const c = this._config, r = this._resolve();
    const $ = (id) => this.shadowRoot.getElementById(id);
    const on = !["off", "unavailable", "holiday"].includes(r.status);
    const pc = PRESETS[r.preset]?.color;
    const wrap = $("wrap");
    wrap.className = `wrap s-${r.status} ${on ? "on" : ""} ${r.burn ? "burn" : ""} ${r.heatOn ? "heat-on" : ""} ${r.errors.length ? "has-err" : ""} ${r.status === "holiday" ? "holiday-on" : ""}`;
    if (pc) wrap.style.setProperty("--pc", pc); else wrap.style.removeProperty("--pc");
    // flame size: modulation 0 → small flame, 100 → full; without sensor: full when burning
    const flame = r.burn || r.status === "hot_water" ? (r.mod != null ? 0.5 + Math.min(100, r.mod) / 200 : 0.9) : 0;
    wrap.style.setProperty("--flame", flame);
    this.shadowRoot.querySelector("ha-card").classList.toggle("on", ["heating", "hot_water", "preheating"].includes(r.status));

    $("name").textContent = c.name || r.clim?.attributes?.friendly_name || "Verwarming";
    let status = this._t(`s_${r.status}`);
    if (r.clim && !["unavailable", "off"].includes(r.status)) {
      const parts = [];
      if (r.preset && r.status !== "holiday" && (PRESETS[r.preset] || HTXT.en[r.preset])) parts.push(this._t(r.preset));
      else if (r.preset && r.status !== "holiday") parts.push(String(r.preset));
      if (r.clim.attributes.temperature != null) parts.push(this._fmt(r.clim.attributes.temperature, "°", this._dec()));
      if (parts.length) status += ` · ${parts.join(" ")}`;
    }
    $("status").textContent = this._busyLabel || status;
    $("alert").hidden = !r.errors.length;
    $("alert-t").textContent = r.errors.map((e) => this._t(`a_${e}`)).join(" · ");

    const room = this._num(c.temperature) ?? r.clim?.attributes?.current_temperature ?? null;
    const lcd = r.errors.length ? "Err" : r.status === "unavailable" ? "" : r.status === "hot_water" ? "WW" : room != null ? `${this._fmt(room, "°", 1)}` : "--";
    this.shadowRoot.querySelector(".lcd").textContent = lcd;

    // tiles (unknown values are hidden — Toon often reports humidity as unknown)
    const tiles = [];
    if (room != null) tiles.push({ e: c.temperature || c.entity, icon: "mdi:home-thermometer", lbl: this._t("room"), v: this._fmt(room, this._st(c.temperature)?.attributes?.unit_of_measurement || "°C") });
    const hum = this._num(c.humidity) ?? r.clim?.attributes?.current_humidity ?? null;
    if (hum != null) tiles.push({ e: c.humidity || c.entity, icon: "mdi:water-percent", lbl: this._t("humidity"), v: this._fmt(hum, "%", 0) });
    if (c.modulation && r.mod != null) tiles.push({ e: c.modulation, icon: "mdi:fire-circle", lbl: this._t("modulation"), v: this._fmt(r.mod, "%", 0) });
    (c.tiles || []).forEach((t) => {
      const id = typeof t === "string" ? t : t.entity, s = this._st(id);
      if (!s) return;
      const n = Number(s.state), u = s.attributes.unit_of_measurement;
      tiles.push({ e: id, icon: t.icon || s.attributes.icon || "mdi:information-outline", lbl: t.name || s.attributes.friendly_name || id,
        v: Number.isFinite(n) ? this._fmt(n, u, t.decimals ?? (Number.isInteger(n) ? 0 : 1)) : this._hass.formatEntityState ? this._hass.formatEntityState(s) : s.state });
    });
    const th = tiles.map((t) => `<div class="tile" data-entity="${hesc(t.e || "")}"><span class="val">${t.v}</span><span class="lbl"><ha-icon icon="${t.icon}"></ha-icon>${hesc(t.lbl)}</span></div>`).join("");
    if (th !== this._tilesHtml) { $("stats").innerHTML = th; $("stats").className = `stats ${tiles.length === 3 ? "n3" : ""}`; this._tilesHtml = th; }

    // boiler indicators
    const chips = Object.keys(INDICATORS).filter((k) => c[k] && this._st(c[k])).map((k) => {
      const d = INDICATORS[k], s = this._st(c[k]), bad = HBAD.includes(String(s.state).toLowerCase());
      let cls = "", icon = d.icon, title;
      if (d.problem) {
        const p = this._problem(c[k]);
        cls = bad ? "" : p ? "bad" : "ok";
        if (p) icon = "mdi:alert-circle";
        title = bad ? s.state : this._t(p ? "problem" : "ok");
      } else {
        cls = s.state === "on" ? "lit" : "";
        title = this._t(s.state === "on" ? "on" : "off");
      }
      return `<span class="chip ${cls}" style="${d.color ? `--ic:${d.color}` : ""}" data-entity="${hesc(c[k])}" title="${hesc(this._t(k))}: ${hesc(title)}"><ha-icon icon="${icon}"></ha-icon>${hesc(this._t(k))}<span class="cd"></span></span>`;
    }).join("");
    if (c.show_indicators !== false && chips !== this._chipsHtml) { $("chips").innerHTML = chips; this._chipsHtml = chips; }

    // preset buttons
    this.shadowRoot.querySelectorAll(".mode").forEach((el) => el.classList.toggle("active", !!el.dataset.preset && el.dataset.preset === r.preset && r.status !== "holiday"));

    // controls
    const showT = r.clim && !["unavailable", "off"].includes(r.status) && r.clim.attributes.temperature != null && c.show_target !== false;
    $("target").hidden = !showT;
    if (showT) {
      $("tv").textContent = this._fmt(this._pendingTarget ?? r.clim.attributes.temperature, "°", this._dec());
      $("target").classList.toggle("pending", this._pendingTarget != null);
    }
    let anyRow = showT;
    ["program", "holiday"].forEach((k) => {
      const s = this._st(c[k]);
      $(`r-${k}`).hidden = !s;
      if (!s) return;
      anyRow = true;
      $(`sw-${k}`).setAttribute("aria-checked", this._pv(k, s.state === "on") ? "true" : "false");
    });
    $("override").hidden = !(c.program_override && this._on(c.program_override));
    $("controls").classList.toggle("closed", !(anyRow && r.status !== "unavailable"));
  }

  _dec() { const s = this._config.step || this._st(this._config.entity)?.attributes?.target_temp_step || 0.5; return s < 1 ? 1 : 0; }
  _pv(k, actual) {
    const p = this._pend?.[k];
    if (!p) return actual;
    if (p.v === actual || Date.now() - p.at > 6000) { delete this._pend[k]; return actual; }
    return p.v;
  }

  async _toggleSw(k) {
    const id = this._config[k], s = this._st(id);
    if (!s || HBAD.includes(String(s.state).toLowerCase())) return;
    const next = !this._pv(k, s.state === "on");
    this._pend[k] = { v: next, at: Date.now() };
    this._render();
    const dom = id.split(".")[0];
    try { await this._hass.callService(["switch", "input_boolean"].includes(dom) ? dom : "homeassistant", next ? "turn_on" : "turn_off", { entity_id: id }); }
    catch (e) { console.error("heating-card:", e); delete this._pend[k]; this._render(); }
    setTimeout(() => this._render(), 6100);
  }

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
    if (b.preset) this._pend.preset = { v: b.preset, at: Date.now() };
    this._render();
    try {
      if (b.tap_action || b.action) await this._runAction(b.tap_action || b);
      else if (b.script) await this._hass.callService("script", "turn_on", { entity_id: b.script });
      else if (c.entity && b.preset) await this._hass.callService("climate", "set_preset_mode", { entity_id: c.entity, preset_mode: b.preset });
    } catch (e) {
      console.error("heating-card:", e);
      delete this._pend.preset;
    } finally {
      setTimeout(() => { el.classList.remove("busy"); this._busyLabel = null; this._render(); }, 600);
      setTimeout(() => this._render(), 6100);
    }
  }

  async _runAction(a) {
    const type = a.action;
    if (type === "more-info") return this._moreInfo(a.entity || this._config.entity);
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

  _nudge(dir) {
    const clim = this._st(this._config.entity);
    if (!clim) return;
    const a = clim.attributes, step = this._config.step || a.target_temp_step || 0.5;
    let v = Math.round(((this._pendingTarget ?? a.temperature) + dir * step) / step) * step;
    v = Math.min(a.max_temp ?? 30, Math.max(a.min_temp ?? 6, v));
    this._pendingTarget = v;
    this._render();
    clearTimeout(this._tTimer);
    this._tTimer = setTimeout(async () => {
      try { await this._hass.callService("climate", "set_temperature", { entity_id: this._config.entity, temperature: v }); }
      catch (e) { console.error("heating-card:", e); }
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
const HED_TXT = {
  en: {
    name: "Name", entity: "Thermostat (climate entity)",
    program: "Program switch", holiday: "Holiday mode switch", program_override: "Program override (binary sensor)",
    temperature: "Room temperature sensor (optional)", humidity: "Humidity sensor (optional)", modulation: "Modulation level sensor",
    burner: "Burner", heating: "Heating", hot_water: "Hot tap water", preheating: "Preheating", opentherm: "OpenTherm connection", boiler_status: "Boiler status",
    columns: "Buttons per row", show_target: "Show target temperature control", hide_buttons: "Hide buttons", show_indicators: "Show boiler status lights",
    sec_main: "Thermostat", sec_buttons: "Preset buttons", sec_controls: "Controls", sec_sensors: "Sensors", sec_boiler: "Boiler", sec_layout: "Layout",
    preset: "Preset", btn_name: "Label (optional)", icon: "Icon (optional)", script: "Script instead of preset (optional)", color: "Colour (optional, e.g. #e040fb)",
    add: "Add button", none_sel: "— none —", from_climate: "No buttons configured: they're generated from the thermostat's presets.",
    yaml_action: "Uses a custom action from YAML — edit it in the code editor.", up: "Move up", down: "Move down", remove: "Remove",
    boiler_hint: "Binary sensors shown as status lights. OpenTherm and status turn red when they report a problem.",
  },
  nl: {
    name: "Naam", entity: "Thermostaat (climate-entiteit)",
    program: "Programma-schakelaar", holiday: "Vakantiemodus-schakelaar", program_override: "Programma overschreven (binaire sensor)",
    temperature: "Kamertemperatuur-sensor (optioneel)", humidity: "Vochtigheidssensor (optioneel)", modulation: "Modulatieniveau-sensor",
    burner: "Brander", heating: "Verwarmen (CV)", hot_water: "Warm tapwater", preheating: "Voorverwarmen", opentherm: "OpenTherm-verbinding", boiler_status: "Ketelstatus",
    columns: "Knoppen per rij", show_target: "Doeltemperatuur-regeling tonen", hide_buttons: "Knoppen verbergen", show_indicators: "Ketel-statuslampjes tonen",
    sec_main: "Thermostaat", sec_buttons: "Preset-knoppen", sec_controls: "Bediening", sec_sensors: "Sensoren", sec_boiler: "Ketel", sec_layout: "Weergave",
    preset: "Preset", btn_name: "Label (optioneel)", icon: "Icoon (optioneel)", script: "Script i.p.v. preset (optioneel)", color: "Kleur (optioneel, bijv. #e040fb)",
    add: "Knop toevoegen", none_sel: "— geen —", from_climate: "Geen knoppen ingesteld: ze worden gemaakt uit de presets van de thermostaat.",
    yaml_action: "Gebruikt een eigen actie uit YAML — pas die aan in de code-editor.", up: "Omhoog", down: "Omlaag", remove: "Verwijderen",
    boiler_hint: "Binaire sensoren, getoond als statuslampjes. OpenTherm en status worden rood bij een probleem.",
  },
};

const HED_STYLE = `
.section { margin-top: 20px; }
.section h3 { margin: 0 0 8px; font-size: 15px; font-weight: 500; color: var(--primary-text-color); }
.hint { font-size: 12px; color: var(--secondary-text-color); margin: 0 0 10px; }
.btn-row { border: 1px solid var(--divider-color, rgba(127,127,127,.3)); border-radius: 12px; padding: 8px 10px 10px; margin-bottom: 10px; }
.btn-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.btn-head .sq { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; color: #fff; flex: none; }
.btn-head .sq ha-icon { --mdc-icon-size: 18px; }
.btn-head .t { flex: 1; font-weight: 500; font-size: 14px; color: var(--primary-text-color); }
.btn-head button { border: none; background: none; cursor: pointer; color: var(--secondary-text-color); border-radius: 50%; width: 32px; height: 32px; display: grid; place-items: center; }
.btn-head button:hover { background: rgba(127,127,127,.15); color: var(--primary-text-color); }
.btn-head button[disabled] { opacity: .3; pointer-events: none; }
.add { border: 1px dashed var(--primary-color); background: none; cursor: pointer; border-radius: 10px; padding: 8px 14px; display: inline-flex; gap: 6px; align-items: center; font: inherit; font-size: 14px; color: var(--primary-color); }
.add:hover { background: color-mix(in srgb, var(--primary-color) 10%, transparent); }
.note { font-size: 12px; color: var(--secondary-text-color); margin: 2px 0 6px; }
`;

class HeatingCardEditor extends HTMLElement {
  setConfig(config) { this._config = { ...config }; this._render(); }
  set hass(hass) {
    this._hass = hass;
    this.shadowRoot?.querySelectorAll("ha-form").forEach((f) => (f.hass = hass));
    if (!this._built) this._render();
  }
  _t(k) { return (HED_TXT[hLang(this._hass)] || HED_TXT.en)[k] ?? HED_TXT.en[k] ?? k; }
  _ct(k) { return (HTXT[hLang(this._hass)] || HTXT.en)[k] ?? k; }

  _presetOptions() {
    const pm = this._hass?.states?.[this._config.entity]?.attributes?.preset_modes || ["comfort", "home", "sleep", "away"];
    const all = [...new Set([...pm, ...this._buttonsNow().map((b) => b.preset).filter(Boolean)])]
      .sort((a, b) => (PRESET_ORDER.indexOf(a) + 1 || 99) - (PRESET_ORDER.indexOf(b) + 1 || 99));
    return [{ value: "", label: this._t("none_sel") }, ...all.map((p) => ({ value: p, label: this._ct(p) }))];
  }

  _schemas() {
    const bs = (dc) => ({ entity: { domain: "binary_sensor", ...(dc ? { device_class: dc } : {}) } });
    return {
      main: [{ name: "name", selector: { text: {} } }, { name: "entity", selector: { entity: { domain: "climate" } } }],
      controls: [
        { name: "program", selector: { entity: { domain: ["switch", "input_boolean"] } } },
        { name: "program_override", selector: bs() },
        { name: "holiday", selector: { entity: { domain: ["switch", "input_boolean"] } } },
      ],
      sensors: [
        { name: "temperature", selector: { entity: { domain: "sensor", device_class: "temperature" } } },
        { name: "humidity", selector: { entity: { domain: "sensor", device_class: "humidity" } } },
        { name: "modulation", selector: { entity: { domain: "sensor" } } },
      ],
      boiler: ["burner", "heating", "hot_water", "preheating", "opentherm", "boiler_status"].map((name) => ({ name, selector: bs() })),
      layout: [
        { name: "columns", selector: { number: { min: 1, max: 6, step: 1, mode: "slider" } } },
        { name: "show_target", selector: { boolean: {} } },
        { name: "show_indicators", selector: { boolean: {} } },
        { name: "hide_buttons", selector: { boolean: {} } },
      ],
      btn: [
        { name: "preset", selector: { select: { mode: "dropdown", custom_value: true, options: this._presetOptions() } } },
        { type: "grid", name: "", schema: [{ name: "name", selector: { text: {} } }, { name: "icon", selector: { icon: {} } }] },
        { name: "script", selector: { entity: { domain: "script" } } },
        { name: "color", selector: { text: {} } },
      ],
    };
  }

  _render() {
    if (!this._config) return;
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    const btns = this._buttonsNow();
    const sig = String(btns.length);
    if (this._built && sig === this._sig) { this._update(btns); return; }
    this._sig = sig;
    this._built = true;
    const sch = this._schemas();
    const sec = (id, title, hint = "") => `<div class="section"><h3>${title}</h3>${hint ? `<p class="hint">${hint}</p>` : ""}<div id="f-${id}"></div></div>`;
    this.shadowRoot.innerHTML = `<style>${HED_STYLE}</style>
      <div class="section" style="margin-top:0"><h3>${this._t("sec_main")}</h3><div id="f-main"></div></div>
      <div class="section"><h3>${this._t("sec_buttons")}</h3>
        ${btns.length ? "" : `<p class="hint">${this._t("from_climate")}</p>`}
        <div id="btns">${btns.map((b, i) => `
          <div class="btn-row" data-i="${i}">
            <div class="btn-head">
              <span class="sq"><ha-icon></ha-icon></span><span class="t"></span>
              <button data-act="up" title="${this._t("up")}" ${i === 0 ? "disabled" : ""}><ha-icon icon="mdi:arrow-up"></ha-icon></button>
              <button data-act="down" title="${this._t("down")}" ${i === btns.length - 1 ? "disabled" : ""}><ha-icon icon="mdi:arrow-down"></ha-icon></button>
              <button data-act="remove" title="${this._t("remove")}"><ha-icon icon="mdi:delete-outline"></ha-icon></button>
            </div>
            <div class="note" hidden>${this._t("yaml_action")}</div>
            <div class="f-btn"></div>
          </div>`).join("")}</div>
        <button class="add" id="add"><ha-icon icon="mdi:plus"></ha-icon>${this._t("add")}</button>
      </div>
      ${sec("controls", this._t("sec_controls"))}
      ${sec("sensors", this._t("sec_sensors"))}
      ${sec("boiler", this._t("sec_boiler"), this._t("boiler_hint"))}
      ${sec("layout", this._t("sec_layout"))}`;

    const mk = (host, schema, keys, isBtn) => {
      const f = document.createElement("ha-form");
      f.hass = this._hass; f.schema = schema; f.data = {};
      f.computeLabel = (s) => this._t(isBtn && s.name === "name" ? "btn_name" : s.name);
      f.addEventListener("value-changed", (ev) => { ev.stopPropagation(); keys(ev.detail.value); });
      host.appendChild(f);
      return f;
    };
    const $ = (id) => this.shadowRoot.getElementById(id);
    const keysOf = (s) => s.flatMap((x) => (x.type === "grid" ? x.schema : [x])).map((x) => x.name);
    this._forms = {};
    ["main", "controls", "sensors", "boiler", "layout"].forEach((k) => {
      this._forms[k] = mk($(`f-${k}`), sch[k], (v) => this._patch(v, keysOf(sch[k])));
    });
    this._forms.btns = [...this.shadowRoot.querySelectorAll(".btn-row")].map((row) => {
      const i = Number(row.dataset.i);
      return mk(row.querySelector(".f-btn"), sch.btn, (v) => this._patchBtn(i, v), true);
    });
    $("add").addEventListener("click", () => {
      const cur = this._buttonsNow(), used = cur.map((b) => b.preset);
      const next = this._presetOptions().map((o) => o.value).find((p) => p && !used.includes(p)) || "";
      this._setButtons([...cur, { preset: next }]);
    });
    $("btns").addEventListener("click", (ev) => {
      const b = ev.target.closest("button[data-act]");
      if (!b) return;
      const i = Number(b.closest(".btn-row").dataset.i), list = this._buttonsNow();
      if (b.dataset.act === "remove") list.splice(i, 1);
      if (b.dataset.act === "up" && i > 0) [list[i - 1], list[i]] = [list[i], list[i - 1]];
      if (b.dataset.act === "down" && i < list.length - 1) [list[i + 1], list[i]] = [list[i], list[i + 1]];
      this._setButtons(list);
    });
    this._update(btns);
  }

  _update(btns) {
    const c = this._config;
    const pick = (keys) => Object.fromEntries(keys.map((k) => [k, c[k]]));
    this._forms.main.data = pick(["name", "entity"]);
    this._forms.controls.data = pick(["program", "program_override", "holiday"]);
    this._forms.sensors.data = pick(["temperature", "humidity", "modulation"]);
    this._forms.boiler.data = pick(["burner", "heating", "hot_water", "preheating", "opentherm", "boiler_status"]);
    this._forms.layout.data = { columns: c.columns, show_target: c.show_target !== false, show_indicators: c.show_indicators !== false, hide_buttons: !!c.hide_buttons };
    const rows = this.shadowRoot.querySelectorAll(".btn-row");
    btns.forEach((b, i) => {
      const row = rows[i];
      if (!row) return;
      this._forms.btns[i].data = { preset: b.preset || "", name: b.name, icon: b.icon, script: b.script, color: b.color };
      const p = PRESETS[b.preset];
      row.querySelector(".sq").style.background = b.color || p?.color || "#9aa3ad";
      row.querySelector(".sq ha-icon").setAttribute("icon", b.icon || p?.icon || "mdi:gesture-tap");
      row.querySelector(".t").textContent = b.name || (b.preset ? this._ct(b.preset) : `#${i + 1}`);
      row.querySelector(".note").hidden = !(b.action || b.tap_action || b.perform_action || b.service);
    });
  }

  _buttonsNow() {
    return Array.isArray(this._config.buttons) ? this._config.buttons.map((b) => (typeof b === "string" ? { preset: b } : { ...b })) : [];
  }
  _patch(v, keys) {
    const c = { ...this._config };
    keys.forEach((k) => {
      let val = v[k];
      if (k === "show_target" || k === "show_indicators") val = val === false ? false : undefined;
      if (k === "hide_buttons") val = val ? true : undefined;
      if (val === "" || val == null) delete c[k]; else c[k] = val;
    });
    this._emit(c);
  }
  _patchBtn(i, v) {
    const list = this._buttonsNow(), b = { ...list[i] };
    ["preset", "name", "icon", "script", "color"].forEach((k) => { if (v[k] === "" || v[k] == null) delete b[k]; else b[k] = v[k]; });
    list[i] = b;
    this._setButtons(list);
  }
  _setButtons(list) {
    const c = { ...this._config };
    if (list.length) c.buttons = list; else delete c.buttons;
    this._emit(c);
  }
  _emit(config) {
    const { type, ...rest } = config;
    this._config = { type, ...rest };
    this._render();
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
  }
}

customElements.define("heating-card-editor", HeatingCardEditor);
customElements.define("heating-card", HeatingCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "heating-card", name: "Heating card", description: "Animated central-heating card (Toon / any thermostat) with presets, program and boiler status", preview: true });
console.info(`%c HEATING-CARD %c ${HC_VERSION} `, "color:#fff;background:#ff8a3d;font-weight:700", "color:#ff8a3d");
