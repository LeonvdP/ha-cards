/*
 * hood-card — animated cooker / extractor hood card for Home Assistant
 * Works with a fan entity (speed stages + presets such as intensive), a select with stage options (Home Connect)
 * or a plain switch, plus an optional light, cooktop sensor, grease-filter sensor and power sensor.
 * Same design language as aircon-, heating-, awning- and the appliance cards.
 */
const HD_VERSION = "1.1.1";

// stage icons are built as `mdi:fan-speed-${n}`; listed here for tools/gen-icons.mjs: mdi:fan-speed-1 mdi:fan-speed-2 mdi:fan-speed-3
// one distinct colour per stage (green → blue → purple → pink → amber → red); intensive is orange
const RAMP = ["#66bb6a", "#29b6f6", "#7e57c2", "#ec407a", "#ffa726", "#ef5350"];
// named levels in select options (English and Dutch) → stage number; the canonical word gives the translated label
const HD_LEVELS = [
  ["very_high", 4, /(^|_)(very_high|extra_high|zeer_hoog|extra_hoog)$/],
  ["low", 1, /(^|_)(low|laag|min|minimum|minimaal)$/],
  ["medium", 2, /(^|_)(medium|mid|middle|middel|midden|gemiddeld|normal|normaal)$/],
  ["high", 3, /(^|_)(high|hoog)$/],
];
// dark text on an active button with a light colour
const hdIsLight = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ""));
  if (!m) return false;
  const v = parseInt(m[1], 16), r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 170;
};
const PRESET_STYLE = {
  intensive: { icon: "mdi:fan-plus", color: "#ff7043", boost: true },
  boost: { icon: "mdi:fan-plus", color: "#ff7043", boost: true },
  max: { icon: "mdi:fan-plus", color: "#ff7043", boost: true },
  auto: { icon: "mdi:fan-auto", color: "#b39ddb" },
  automatic: { icon: "mdi:fan-auto", color: "#b39ddb" },
  eco: { icon: "mdi:leaf", color: "#66bb6a" },
  silent: { icon: "mdi:volume-off", color: "#90a4ae" },
  delayed_shutoff: { icon: "mdi:timer-outline", color: "#b0bec5" },
};
const HD_TXT = {
  en: {
    dev_name: "Extractor hood", off: "Off", on: "On", stage: "Stage {n}", s_off: "Off", s_stage: "Stage {n}", s_preset: "{p}", s_light: "Light on", s_unavailable: "Unavailable",
    sending: "Sending…", light: "Light", filter: "Grease filter", power: "Power", cooking: "Cooking",
    intensive: "Intensive", boost: "Boost", max: "Max", auto: "Auto", automatic: "Auto", eco: "Eco", silent: "Silent", delayed_shutoff: "Run-on",
    lv_low: "Low", lv_medium: "Medium", lv_high: "High", lv_very_high: "Very high",
    a_filter: "Clean the grease filter",
  },
  nl: {
    dev_name: "Afzuigkap", off: "Uit", on: "Aan", stage: "Stand {n}", s_off: "Uit", s_stage: "Stand {n}", s_preset: "{p}", s_light: "Verlichting aan", s_unavailable: "Niet beschikbaar",
    sending: "Versturen…", light: "Verlichting", filter: "Vetfilter", power: "Vermogen", cooking: "Koken",
    intensive: "Intensief", boost: "Boost", max: "Max", auto: "Auto", automatic: "Auto", eco: "Eco", silent: "Stil", delayed_shutoff: "Nalooptijd",
    lv_low: "Laag", lv_medium: "Middel", lv_high: "Hoog", lv_very_high: "Zeer hoog",
    a_filter: "Vetfilter reinigen",
  },
};
const HD_BAD = ["unavailable", "unknown", "none", ""];
const HD_ACTIVE = ["on", "present", "true", "full", "nearly_full", "reached", "problem", "yes", "detected"];
const hdEsc = (v) => String(v ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
const hdLang = (hass) => String(hass?.locale?.language || hass?.language || "en").slice(0, 2);
const hdNorm = (v) => String(v ?? "").trim().toLowerCase().split(".").pop().replace(/[\s-]+/g, "_");
// "Cooking.Hood.EnumType.Stage.FanStage02" → stage 2, "…FanOff" → 0, "…IntensiveStage1" → intensive
const hdOption = (o) => {
  const n = hdNorm(o).replace(/^cooking_hood_enum_type_(stage_)?/, "");
  if (/(^|_)(fan_?)?off$|^off$|^stop$|^0$/.test(n)) return { kind: "off" };
  if (/intens|boost|max/.test(n)) return { kind: "preset", preset: "intensive" };
  if (/auto/.test(n)) return { kind: "preset", preset: "auto" };
  const lv = HD_LEVELS.find(([, , re]) => re.test(n));
  if (lv) return { kind: "stage", n: lv[1], word: lv[0] };
  const m = n.match(/(\d+)$/);
  return m ? { kind: "stage", n: Number(m[1]) } : { kind: "preset", preset: n };
};

const HD_SVG = `
<defs>
<linearGradient id="ID-steel" x1="0" x2="1"><stop offset="0" stop-color="#b9c0c7"/><stop offset=".2" stop-color="#eef1f4"/><stop offset=".55" stop-color="#d0d6db"/><stop offset=".82" stop-color="#f4f6f8"/><stop offset="1" stop-color="#b1b8bf"/></linearGradient>
<linearGradient id="ID-panel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9edf0"/><stop offset="1" stop-color="#c9cfd5"/></linearGradient>
<linearGradient id="ID-chrome" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbfcfd"/><stop offset=".3" stop-color="#a3abb4"/><stop offset=".55" stop-color="#eef1f4"/><stop offset=".8" stop-color="#8d959f"/><stop offset="1" stop-color="#c9ced4"/></linearGradient>
<linearGradient id="ID-beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3c4" stop-opacity=".85"/><stop offset="1" stop-color="#fff3c4" stop-opacity="0"/></linearGradient>
<radialGradient id="ID-zone" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff5a1f" stop-opacity=".95"/><stop offset=".6" stop-color="#ff3d00" stop-opacity=".45"/><stop offset="1" stop-color="#ff3d00" stop-opacity="0"/></radialGradient>
<linearGradient id="ID-gloss" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
<radialGradient id="ID-puff" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#eef2f5" stop-opacity=".95"/><stop offset=".55" stop-color="#eef2f5" stop-opacity=".55"/><stop offset="1" stop-color="#eef2f5" stop-opacity="0"/></radialGradient>
</defs>
<g class="hd-beam"><path d="M27 71.5h14l9 46.5H13z" fill="url(#ID-beam)"/><path d="M79 71.5h14l14 46.5H70z" fill="url(#ID-beam)"/></g>
<rect x="47" y="0" width="26" height="49" fill="url(#ID-steel)" stroke="#9aa3ad" stroke-width=".5"/>
<path d="M50 0v49" stroke="#fff" stroke-opacity=".45" stroke-width="2"/>
<g class="hd-flow" fill="none" stroke-linecap="round" stroke-width="1.6"><path d="M54 46V3"/><path d="M60 46V3"/><path d="M66 46V3"/></g>
<path d="M47 48.5h26l31 13.5v8.5H16V62z" fill="url(#ID-steel)" stroke="#9aa3ad" stroke-width=".6"/>
<path d="M47 48.5h26l31 13.5H16z" fill="url(#ID-gloss)" opacity=".6"/>
<circle cx="60" cy="56" r="5.6" fill="#262c33" stroke="#8d959f" stroke-width=".5"/>
<g class="hd-fan" fill="#aab4bd"><path d="M60 56c-.6-2.4.2-4.4 2.2-4.6c.8 1.6-.2 3.6-2.2 4.6z"/><path d="M60 56c-.6-2.4.2-4.4 2.2-4.6c.8 1.6-.2 3.6-2.2 4.6z" transform="rotate(120 60 56)"/><path d="M60 56c-.6-2.4.2-4.4 2.2-4.6c.8 1.6-.2 3.6-2.2 4.6z" transform="rotate(240 60 56)"/></g>
<circle cx="60" cy="56" r="1.1" fill="#d7dce1"/>
<rect x="16" y="62" width="88" height="8.5" fill="url(#ID-panel)" stroke="#9aa3ad" stroke-width=".5"/>
<circle class="led led-pwr" cx="21" cy="66.2" r="1"/>
<g fill="#b3bbc3" stroke="#8d959f" stroke-width=".3"><circle cx="28" cy="66.2" r="1.5"/><circle cx="33.5" cy="66.2" r="1.5"/><circle cx="39" cy="66.2" r="1.5"/><circle cx="44.5" cy="66.2" r="1.5"/></g>
<rect x="73" y="63.2" width="18" height="6" rx="1.2" fill="#0c1720" opacity=".92"/>
<text class="lcd" x="82" y="66.3" text-anchor="middle"></text>
<rect class="hd-lamp" x="28" y="70.5" width="12" height="1.6" rx=".8"/><rect class="hd-lamp" x="80" y="70.5" width="12" height="1.6" rx=".8"/>
<rect x="4" y="118" width="112" height="5" rx="1.5" fill="#1d2228"/>
<ellipse cx="40" cy="120.4" rx="11" ry="1.5" fill="none" stroke="#3a424b" stroke-width=".6"/>
<ellipse cx="81" cy="120.4" rx="10" ry="1.4" fill="none" stroke="#3a424b" stroke-width=".6"/>
<ellipse class="hd-zone" cx="40" cy="120.4" rx="15" ry="2.6" fill="url(#ID-zone)"/>
<ellipse class="hd-zone" cx="81" cy="120.4" rx="14" ry="2.5" fill="url(#ID-zone)"/>
<rect x="4" y="123" width="112" height="3" fill="#9aa3ad"/>
<g class="hd-steam" fill="url(#ID-puff)">
  <circle cx="34" cy="101" r="6" style="--dx:18px"/><circle cx="40" cy="100" r="7" style="--dx:13px"/><circle cx="46" cy="101" r="5.6" style="--dx:9px"/>
  <circle cx="76" cy="111" r="5.4" style="--dx:-10px"/><circle cx="85" cy="111" r="5" style="--dx:-18px"/>
</g>
<path d="M29 104.5h22v10a3 3 0 0 1-3 3H32a3 3 0 0 1-3-3z" fill="url(#ID-chrome)" stroke="#7d8790" stroke-width=".5"/>
<path d="M27.5 104.5h25" stroke="#7d8790" stroke-width="1.5" stroke-linecap="round"/>
<path d="M25 108h4M51 108h4" stroke="#7d8790" stroke-width="1.6" stroke-linecap="round"/>
<ellipse cx="81" cy="116.6" rx="11.5" ry="2.3" fill="#3a424b"/>
<path d="M92 116.2l13-1.6" stroke="#3a424b" stroke-width="2.2" stroke-linecap="round"/>
<rect x="8" y="126" width="104" height="13" fill="rgba(127,127,127,.18)"/>
<path d="M60 127v11" stroke="rgba(127,127,127,.35)" stroke-width=".6"/>`;

const HD_STYLE = `
:host {
  --hd-off: var(--disabled-text-color, #9aa3ad);
  --hd-alert: var(--error-color, #db4437);
  display: block; height: 100%;
}
:host([paused]) *, :host([paused]) *::before, :host([paused]) *::after { animation-play-state: paused !important; }
ha-card { height: 100%; overflow: hidden; container-type: inline-size; position: relative; }
ha-card::before {
  content: ""; position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 1s, background 1s;
  background: radial-gradient(120% 90% at 0% 0%, color-mix(in srgb, var(--c) 18%, transparent), transparent 60%);
}
ha-card.on::before { opacity: 1; }
.wrap { --c: var(--hd-off); padding: 14px; display: flex; flex-direction: column; gap: 12px; position: relative; }
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
.run .dot::after { content: ""; position: absolute; inset: 0; border-radius: 50%; background: var(--c); animation: pulse 2s ease-out infinite; }
.alert { display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; color: var(--hd-alert); }
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
  --mc: var(--hd-off); --mt: #fff;
  position: relative; overflow: hidden; border: none; border-radius: 12px; padding: 9px 4px 8px; cursor: pointer; font: inherit;
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  color: var(--secondary-text-color); background: rgba(127,127,127,.10);
  transition: background .3s, color .3s, transform .15s, box-shadow .3s;
}
.mode.light { --mt: #0d2a33; }
.mode ha-icon { --mdc-icon-size: 22px; color: var(--mc); transition: color .3s, transform .4s; }
.mode .ml { font-size: 12px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.mode:hover { background: rgba(127,127,127,.17); }
.mode:active { transform: scale(.96); }
.mode:focus-visible { outline: 2px solid var(--mc); outline-offset: 2px; }
.mode.active { color: var(--mt); background: var(--mc); box-shadow: 0 4px 14px -4px color-mix(in srgb, var(--mc) 70%, transparent); }
.mode.active ha-icon { color: var(--mt); }
.mode.active.fanb ha-icon { animation: spin 1.333s linear infinite; }
.mode.busy::after {
  content: ""; position: absolute; inset: 0; border-radius: inherit;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent); animation: sweep .9s linear infinite;
}
.modes.ro .mode { cursor: default; }
.modes.ro .mode:not(.active):hover { background: rgba(127,127,127,.10); }
.modes.ro .mode:active { transform: none; }
.mode .ripple { position: absolute; border-radius: 50%; transform: scale(0); background: color-mix(in srgb, var(--mc) 45%, transparent); animation: ripple .6s ease-out forwards; pointer-events: none; }

.controls { display: grid; grid-template-rows: 1fr; transition: grid-template-rows .45s ease, opacity .35s ease, margin .45s ease; }
.controls.closed { grid-template-rows: 0fr; opacity: 0; margin-top: -12px; pointer-events: none; }
.cin { overflow: hidden; min-height: 0; border-radius: 12px; background: rgba(127,127,127,.09); }
.crow { display: flex; align-items: center; gap: 10px; padding: 6px 6px 6px 12px; min-height: 46px; box-sizing: border-box; }
.crow[hidden] { display: none; }
.crow:not([hidden]) ~ .crow:not([hidden]) { border-top: 1px solid rgba(127,127,127,.14); }
.crow > ha-icon { --mdc-icon-size: 18px; color: var(--c); flex: none; transition: color .4s; }
.light-on .crow > ha-icon.lamp { color: #ffc107; }
.tl { flex: 1; min-width: 0; font-size: 13px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.crow.toggle { cursor: pointer; }
.sw { position: relative; width: 42px; height: 24px; margin-right: 4px; padding: 0; border-radius: 12px; border: none; cursor: pointer; flex: none; background: rgba(127,127,127,.35); transition: background .25s; }
.sw span { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.3); transition: transform .3s cubic-bezier(.3,1.4,.5,1); }
.sw[aria-checked=true] { background: #ffc107; }
.sw[aria-checked=true] span { transform: translateX(18px); }
.sw:focus-visible { outline: 2px solid var(--c); outline-offset: 2px; }

.wrap.run { --c: var(--pc, #29b6f6); }
.wrap.s-light { --c: #ffc107; }

/* ---- illustration ---- */
.lcd { font: 700 5.6px ui-monospace, "Courier New", monospace; dominant-baseline: central; fill: #5c6a76; transition: fill .4s; }
.on .lcd { fill: var(--c); }
.led { fill: #5a636d; transition: fill .3s; }
.on .led-pwr { fill: #3ddc84; }
.hd-lamp { fill: #c9ced4; transition: fill .4s; }
.light-on .hd-lamp { fill: #fff8e1; }
.hd-beam { opacity: 0; transition: opacity .6s; }
.light-on .hd-beam { opacity: .9; }
.hd-flow path { stroke: var(--c); stroke-dasharray: 3 6; opacity: 0; transition: opacity .6s; }
.run .hd-flow path { opacity: .75; animation: flow var(--fl, 1s) linear infinite; }
.hd-flow path:nth-child(2) { animation-delay: -.3s !important; }
.hd-fan { transform-box: view-box; transform-origin: 60px 56px; }
.run .hd-fan { animation: spin var(--fs, 1s) linear infinite; }
.hd-zone { opacity: 0; transition: opacity 1s; }
.cook .hd-zone { opacity: .85; animation: glow 2s ease-in-out infinite; }
.hd-steam circle { opacity: 0; transform-box: fill-box; transform-origin: center; }
.cook .hd-steam circle { animation: rise 2s ease-out infinite; }
.run .hd-steam circle { animation: suck var(--ss, 2s) ease-in infinite; }
.hd-steam circle:nth-child(2) { animation-delay: -.5s !important; } .hd-steam circle:nth-child(3) { animation-delay: -1s !important; }
.hd-steam circle:nth-child(4) { animation-delay: -.25s !important; } .hd-steam circle:nth-child(5) { animation-delay: -1.25s !important; }
.sp1 { --fl: 1s; --fs: 1s; --ss: 2s; } .sp2 { --fl: .8s; --fs: .5s; --ss: 1.333s; }
.sp3 { --fl: .5s; --fs: .4s; --ss: 1s; } .sp4 { --fl: .4s; --fs: .25s; --ss: .8s; }

@keyframes glow { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
@keyframes pulse { 0% { transform: scale(1); opacity: .55; } 100% { transform: scale(2.8); opacity: 0; } }
@keyframes sweep { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
@keyframes ripple { to { transform: scale(2.6); opacity: 0; } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes flow { to { stroke-dashoffset: -18; } } /* negative: the dashes travel along the path, from the hood (y 46) up to the ceiling (y 3) */
@keyframes rise { 0% { opacity: 0; transform: translateY(0) scale(.6); } 25% { opacity: .75; } 100% { opacity: 0; transform: translateY(-16px) scale(1.6); } }
@keyframes suck { 0% { opacity: 0; transform: translate(0,0) scale(.6); } 20% { opacity: .8; } 85% { opacity: .5; } 100% { opacity: 0; transform: translate(var(--dx, 0), -36px) scale(1.3); } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; } }
@container (max-width: 460px) { .modes[style*="--n:5"] .ml, .modes[style*="--n:6"] .ml { font-size: 11px; } }
@container (max-width: 340px) {
  .illus { width: var(--aircon-illustration-size-small, 84px); grid-row: auto; }
  .stats { grid-column: 1 / -1; }
  .mode .ml { font-size: 11px; }
}
`;

class HoodCard extends HTMLElement {
  static async getConfigElement() {
    if (!customElements.get("ha-form") || !customElements.get("ha-entity-picker")) {
      try {
        const helpers = await window.loadCardHelpers?.();
        const tile = await helpers?.createCardElement({ type: "tile", entity: "sun.sun" });
        await tile?.constructor?.getConfigElement?.();
      } catch (e) { /* ignore */ }
    }
    return document.createElement("hood-card-editor");
  }

  static getStubConfig(hass) {
    const ids = Object.keys(hass?.states || {}).filter((e) => /hood|afzuig|kap|dunstab|extract|range/.test(e));
    const find = (dom, re) => ids.find((e) => e.startsWith(`${dom}.`) && re.test(e.split(".")[1]));
    const cfg = { name: (HD_TXT[hdLang(hass)] || HD_TXT.en).dev_name };
    const pick = {
      entity: find("fan", /./) || find("select", /stage|fan|venting|level/) || find("switch", /fan|power/),
      light: find("light", /./) || find("switch", /light|lamp/),
      filter: find("sensor", /filter|grease/),
      power: find("sensor", /_power$|watt|vermogen/),
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
    if (old.locale?.language !== hass.locale?.language) { this._built = false; return true; } // button labels are translated at build time
    if (old.themes !== hass.themes) return true;
    if (!this._ids) {
      const ids = new Set();
      const walk = (v) => {
        if (typeof v === "string") { if (/^[a-z_]+\.[a-z0-9_]+$/.test(v)) ids.add(v); }
        else if (v && typeof v === "object") Object.values(v).forEach(walk);
      };
      walk(this._config);
      this._ids = [...ids];
    }
    // the button set depends on the fan's attributes (stages, presets): rebuild when they change
    const a = old.states[this._config.entity]?.attributes, b = hass.states[this._config.entity]?.attributes;
    if (this._sigOf(a) !== this._sigOf(b)) this._built = false;
    return this._ids.some((id) => old.states[id] !== hass.states[id]);
  }
  _sigOf(a) { return a ? [a.percentage_step, a.speed_count, (a.preset_modes || []).join(), (a.options || []).join()].join("|") : ""; }
  _observe() {
    if (this._io || typeof IntersectionObserver === "undefined") return;
    this._io = new IntersectionObserver((entries) => this.toggleAttribute("paused", !entries[entries.length - 1].isIntersecting));
    this._io.observe(this);
  }
  connectedCallback() { this._observe(); }
  disconnectedCallback() { this._io?.disconnect(); this._io = null; }
  getCardSize() { return 5; }
  getGridOptions() { return { columns: 12, min_columns: 6, rows: "auto" }; }

  _t(k) { const L = HD_TXT[hdLang(this._hass)] || HD_TXT.en; return L[k] ?? HD_TXT.en[k] ?? k; }
  _st(id) { return typeof id === "string" ? this._hass.states[id] : undefined; }
  _ok(s) { return !!s && !HD_BAD.includes(String(s.state).toLowerCase()); }
  _num(id) { const s = this._st(id); if (!this._ok(s)) return null; const n = Number(s.state); return Number.isFinite(n) ? n : null; }
  _fmt(v, unit, dec = 0) {
    const n = Number(v).toLocaleString(this._hass?.locale?.language || undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
    return `${n}${unit ? (unit === "%" ? "" : " ") + unit : ""}`;
  }
  _dom() { return typeof this._config.entity === "string" ? this._config.entity.split(".")[0] : ""; }
  _stages() {
    const a = this._st(this._config.entity)?.attributes || {};
    const n = this._config.stages || a.speed_count || (a.percentage_step ? Math.round(100 / a.percentage_step) : 3);
    return Math.max(1, Math.min(6, Number(n) || 3));
  }
  _presetLabel(p) {
    const k = hdNorm(p);
    return HD_TXT.en[k] ? this._t(k) : String(p).replace(/_/g, " ").replace(/^./, (x) => x.toUpperCase());
  }

  // the buttons: off, stage 1…N, presets (fan entity) — or one per option (select) — or YAML `buttons`
  _buttons() {
    const c = this._config, s = this._st(c.entity), dom = this._dom(), out = [];
    const stageBtn = (n, N, extra) => ({ kind: "stage", n, label: this._t("stage").replace("{n}", n), short: String(n),
      icon: n <= 3 && N <= 3 ? `mdi:fan-speed-${n}` : "mdi:fan", color: RAMP[Math.max(0, Math.min(RAMP.length - 1, n - 1))], ...extra });
    const presetBtn = (p, extra) => { const st = PRESET_STYLE[hdNorm(p)] || {}; return { kind: "preset", preset: p, label: this._presetLabel(p), icon: st.icon || "mdi:fan-chevron-up", color: st.color || "#b39ddb", boost: !!st.boost, ...extra }; };
    const offBtn = (extra) => ({ kind: "off", label: this._t("off"), icon: "mdi:fan-off", color: "#90a4ae", ...extra });
    if (Array.isArray(c.buttons) && c.buttons.length) {
      return c.buttons.map((b) => {
        const base = b.preset ? presetBtn(b.preset) : b.stage != null ? stageBtn(Number(b.stage), this._stages()) : b.option ? { kind: "option", option: b.option, label: b.option, icon: "mdi:fan", color: "#29b6f6" } : b.off ? offBtn() : { kind: "action", label: "", icon: "mdi:gesture-tap", color: "#29b6f6" };
        return { ...base, label: b.name || base.label, icon: b.icon || base.icon, color: b.color || base.color, cfg: b };
      });
    }
    if (dom === "select" || dom === "input_select") {
      const opts = s?.attributes?.options || [];
      const parsed = opts.map((o) => ({ o, p: hdOption(o) }));
      const N = Math.max(1, ...parsed.filter((x) => x.p.kind === "stage").map((x) => x.p.n));
      parsed.forEach(({ o, p }) => {
        if (p.kind === "off") { if (c.show_off !== false) out.push(offBtn({ option: o })); }
        else if (p.kind === "stage") out.push(stageBtn(p.n, N, p.word ? { option: o, word: p.word, label: this._t(`lv_${p.word}`) } : { option: o }));
        else if (c.show_presets !== false) out.push(presetBtn(p.preset, { option: o, label: this._fs(s, o) || this._presetLabel(p.preset) }));
      });
      return out;
    }
    if (c.show_off !== false) out.push(offBtn());
    if (dom === "fan") {
      const N = this._stages();
      for (let n = 1; n <= N; n++) out.push(stageBtn(n, N));
      if (c.show_presets !== false) (s?.attributes?.preset_modes || []).filter((p) => !["off", "none"].includes(hdNorm(p))).forEach((p) => out.push(presetBtn(p)));
    } else out.push(stageBtn(1, 1, { label: this._t("on"), icon: "mdi:fan", kind: "on" }));
    return out;
  }
  _fs(s, state) {
    try { if (s && this._hass.formatEntityState) return this._hass.formatEntityState(s, state); } catch (e) { /* ignore */ }
    return "";
  }

  // current fan state → which button is active, how fast to animate
  _resolve() {
    const c = this._config, s = this._st(c.entity), dom = this._dom();
    const r = { status: "unavailable", light: false, cook: false, active: -1, sp: 0 };
    const btns = this._btns || [];
    const ls = this._st(c.light);
    r.light = this._ok(ls) && this._pv("light", ls.state === "on");
    const ck = this._st(c.cooktop);
    if (this._ok(ck)) {
      const n = Number(ck.state);
      r.cook = Number.isFinite(n) ? n > Number(c.cooktop_threshold ?? 50) : ["on", "run", "running", "cooking", "heating", "true"].includes(hdNorm(ck.state));
    }
    if (!this._ok(s)) {
      if (!c.entity && this._ok(ls)) r.status = r.light ? "light" : "off";
      return r;
    }
    let cur = { kind: "off" };
    if (dom === "fan") {
      const a = s.attributes;
      if (s.state === "on") {
        const pm = a.preset_mode && !["none", "off"].includes(hdNorm(a.preset_mode)) ? a.preset_mode : null;
        if (pm) cur = { kind: "preset", preset: pm };
        else {
          const N = this._stages(), pct = Number(a.percentage);
          cur = { kind: "stage", n: Number.isFinite(pct) && pct > 0 ? Math.max(1, Math.min(N, Math.ceil(pct * N / 100 - 0.001))) : 1, N };
        }
      }
    } else if (dom === "select" || dom === "input_select") {
      const p = hdOption(s.state);
      cur = { ...p, option: s.state };
    } else cur = s.state === "on" ? { kind: "on" } : { kind: "off" };
    // optimistic: show the pressed button until HA confirms it (max 6 s)
    let active = btns.findIndex((b) => this._match(b, cur));
    const p = this._pend.btn;
    if (p) { if (Date.now() - p.at > 6000 || active === p.i) delete this._pend.btn; else active = p.i; }
    r.active = active;
    const ab = btns[active];
    const k = ab ? ab.kind : cur.kind;
    if (k === "off") r.status = r.light ? "light" : "off";
    else if (k === "on") { r.status = "preset"; r.label = this._t("on"); r.sp = 2; r.color = ab?.color; }
    else {
      r.status = k === "preset" ? "preset" : "stage";
      r.n = ab?.n ?? cur.n ?? 1;
      r.preset = ab?.preset ?? cur.preset;
      r.color = ab?.color;
      const N = cur.N || this._stages();
      r.sp = k === "preset" ? (ab?.boost || /intens|boost|max/.test(hdNorm(r.preset)) ? 4 : 2) : k === "stage" ? Math.max(1, Math.min(3, Math.ceil((r.n / N) * 3))) : 2;
      r.word = ab?.word ?? cur.word;
      r.label = ab?.label ?? (r.word ? this._t(`lv_${r.word}`) : undefined);
    }
    return r;
  }
  _match(b, cur) {
    if (b.option != null && cur.option != null) return b.option === cur.option;
    return b.kind === cur.kind && (b.kind !== "stage" || b.n === cur.n) && (b.kind !== "preset" || hdNorm(b.preset) === hdNorm(cur.preset));
  }

  _build() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    const uid = `hd${Math.random().toString(36).slice(2, 8)}`;
    const btns = this._btns = this._buttons();
    const cols = this._config.columns || Math.min(btns.length, 6) || 1;
    this.shadowRoot.innerHTML = `
      <style>${HD_STYLE}</style>
      <ha-card>
        <div class="wrap" id="wrap">
          <div class="top">
            <div class="illus" id="illus"><svg viewBox="0 0 120 140" aria-hidden="true">${HD_SVG.replace(/ID-/g, `${uid}-`)}</svg></div>
            <div class="head" id="head">
              <div class="name" id="name"></div>
              <div class="status"><span class="dot"></span><span class="txt" id="status"></span></div>
              <div class="alert" id="alert" hidden><ha-icon icon="mdi:alert-circle"></ha-icon><span id="alert-t"></span></div>
            </div>
            <div class="stats" id="stats"></div>
          </div>
          <div class="modes ${this._config.read_only ? "ro" : ""}" id="modes" style="--n:${cols}">
            ${btns.map((b, i) => {
              const light = hdIsLight(b.color);
              return `<button class="mode ${light ? "light" : ""} ${b.kind === "stage" || b.kind === "on" || b.boost ? "fanb" : ""}" data-i="${i}" style="--mc:${hdEsc(b.color)}" title="${hdEsc(b.label)}">
                <ha-icon icon="${hdEsc(b.icon)}"></ha-icon><span class="ml">${hdEsc(b.label)}</span></button>`;
            }).join("")}
          </div>
          <div class="controls closed" id="controls"><div class="cin">
            <div class="crow toggle" id="r-light" hidden>
              <ha-icon class="lamp" icon="mdi:lightbulb-on-outline"></ha-icon><span class="tl">${this._t("light")}</span>
              <button class="sw" id="sw-light" role="switch" aria-checked="false" aria-label="${this._t("light")}"><span></span></button>
            </div>
          </div></div>
        </div>
      </ha-card>`;
    const $ = (id) => this.shadowRoot.getElementById(id);
    this._el = { wrap: $("wrap"), card: this.shadowRoot.querySelector("ha-card"), name: $("name"), status: $("status"), alert: $("alert"), alertT: $("alert-t"),
      stats: $("stats"), lcd: this.shadowRoot.querySelector(".lcd"), controls: $("controls"), rLight: $("r-light"), swLight: $("sw-light"),
      modes: [...this.shadowRoot.querySelectorAll(".mode")] };
    if (this._config.hide_buttons || !btns.length) $("modes").style.display = "none";
    $("modes").addEventListener("click", (ev) => {
      const el = ev.target.closest(".mode");
      if (!el || this._config.read_only) return; // read_only: the buttons only show the state
      this._ripple(el, ev);
      this._press(Number(el.dataset.i), el);
    });
    const more = () => this._moreInfo(this._config.entity || this._config.light);
    $("illus").addEventListener("click", () => (this._config.tap_action ? this._runAction(this._config.tap_action) : more()));
    $("head").addEventListener("click", more);
    $("stats").addEventListener("click", (ev) => { const t = ev.target.closest("[data-entity]"); if (t) this._moreInfo(t.dataset.entity); });
    $("r-light").addEventListener("click", (ev) => { ev.preventDefault(); this._toggleLight(); });
    this._tilesHtml = null;
    this._built = true;
  }

  _render() {
    if (!this._built) this._build();
    const c = this._config, r = this._resolve(), E = this._el;
    const run = r.status === "stage" || r.status === "preset";
    E.wrap.className = `wrap s-${r.status} ${run ? `run sp${r.sp}` : ""} ${run || r.light ? "on" : ""} ${r.light ? "light-on" : ""} ${r.cook ? "cook" : ""}`;
    if (r.color) E.wrap.style.setProperty("--pc", r.color); else E.wrap.style.removeProperty("--pc");
    E.card.classList.toggle("on", run);
    E.name.textContent = c.name || this._st(c.entity)?.attributes?.friendly_name || this._t("dev_name");
    let status = r.status === "stage" ? (r.word ? r.label : this._t("s_stage").replace("{n}", r.n)) : r.status === "preset" ? (r.label || this._presetLabel(r.preset)) : this._t(`s_${r.status}`);
    if (r.cook) status += ` · ${this._t("cooking")}`;
    E.status.textContent = this._busyLabel || status;
    if (E.lcd) E.lcd.textContent = r.status === "unavailable" ? "" : r.status === "stage" ? String(r.n) : r.status === "preset" ? (r.sp === 4 ? "P" : "A") : r.light ? "--" : "";

    // grease filter: a % sensor (tile, warning at 100 %) or a problem-style sensor (warning only)
    const alerts = [], tiles = [];
    const fs = this._st(c.filter), fn = this._num(c.filter);
    if (fn != null) {
      tiles.push({ e: c.filter, icon: "mdi:air-filter", lbl: this._t("filter"), v: this._fmt(fn, fs.attributes.unit_of_measurement || "%") });
      if (fn >= Number(c.filter_alert ?? 100)) alerts.push("filter");
    } else if (this._ok(fs) && HD_ACTIVE.includes(hdNorm(fs.state))) alerts.push("filter");
    const pw = this._num(c.power);
    // shown whenever the sensor has a number, also 0 W while the hood is off (and sensors in kW)
    if (pw != null && c.show_power !== false) tiles.push({ e: c.power, icon: "mdi:flash", lbl: this._t("power"), v: this._fmt(pw, this._st(c.power).attributes.unit_of_measurement || "W") });
    (c.tiles || []).forEach((t) => {
      const id = typeof t === "string" ? t : t.entity, s = this._st(id);
      if (!this._ok(s)) return;
      const n = Number(s.state), u = s.attributes.unit_of_measurement;
      tiles.push({ e: id, icon: t.icon || s.attributes.icon || "mdi:information-outline", lbl: t.name || s.attributes.friendly_name || id,
        v: hdEsc(Number.isFinite(n) ? this._fmt(n, u, t.decimals ?? (Number.isInteger(n) ? 0 : 1)) : this._fs(s) || s.state) });
    });
    E.alert.hidden = !alerts.length;
    E.alertT.textContent = alerts.map((a) => this._t(`a_${a}`)).join(" · ");
    const th = tiles.map((t) => `<div class="tile" data-entity="${hdEsc(t.e || "")}"><span class="val">${t.v}</span><span class="lbl"><ha-icon icon="${hdEsc(t.icon)}"></ha-icon>${hdEsc(t.lbl)}</span></div>`).join("");
    if (th !== this._tilesHtml) { E.stats.innerHTML = th; E.stats.className = `stats ${tiles.length === 3 ? "n3" : ""}`; this._tilesHtml = th; }

    E.modes.forEach((el, i) => el.classList.toggle("active", i === r.active && r.status !== "unavailable"));
    // show_light_switch: false hides the row; the light entity still drives the beams and the status line
    const hasLight = this._ok(this._st(c.light)) && c.show_light_switch !== false;
    E.rLight.hidden = !hasLight;
    E.swLight.setAttribute("aria-checked", r.light ? "true" : "false");
    E.controls.classList.toggle("closed", !hasLight);
  }

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

  async _press(i, el) {
    const b = this._btns?.[i], c = this._config;
    if (!b || !this._hass) return;
    const id = c.entity, dom = this._dom();
    el.classList.add("busy");
    this._busyLabel = this._t("sending");
    this._pend.btn = { i, at: Date.now() };
    this._render();
    try {
      const a = b.cfg && (b.cfg.tap_action || (b.cfg.action && b.cfg));
      if (a) await this._runAction(a);
      else if (b.cfg?.script) await this._hass.callService("script", "turn_on", { entity_id: b.cfg.script });
      else if (b.option != null) await this._hass.callService(dom, "select_option", { entity_id: id, option: b.option });
      else if (dom === "fan") {
        if (b.kind === "off") await this._hass.callService("fan", "turn_off", { entity_id: id });
        else if (b.kind === "preset") await this._hass.callService("fan", "set_preset_mode", { entity_id: id, preset_mode: b.preset });
        else await this._hass.callService("fan", "set_percentage", { entity_id: id, percentage: Math.round((b.n / this._stages()) * 100) });
      } else if (id) {
        const d = ["switch", "input_boolean", "light"].includes(dom) ? dom : "homeassistant";
        await this._hass.callService(d, b.kind === "off" ? "turn_off" : "turn_on", { entity_id: id });
      }
    } catch (e) {
      console.error("hood-card:", e);
      delete this._pend.btn;
    } finally {
      setTimeout(() => { el.classList.remove("busy"); this._busyLabel = null; this._render(); }, 600);
      setTimeout(() => this._render(), 6100);
    }
  }

  async _toggleLight() {
    const id = this._config.light, s = this._st(id);
    if (!this._ok(s)) return;
    const next = !this._pv("light", s.state === "on");
    this._pend.light = { v: next, at: Date.now() };
    this._render();
    const dom = id.split(".")[0];
    try { await this._hass.callService(["light", "switch", "input_boolean"].includes(dom) ? dom : "homeassistant", next ? "turn_on" : "turn_off", { entity_id: id }); }
    catch (e) { console.error("hood-card:", e); delete this._pend.light; this._render(); }
    setTimeout(() => this._render(), 6100);
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

  _moreInfo(entityId) {
    if (!entityId) return;
    this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId }, bubbles: true, composed: true }));
  }
}

// ======================================================================
// Visual editor
// ======================================================================
const HDED_TXT = {
  en: {
    name: "Name", entity: "Fan (fan, select with stages, or switch)", stages: "Number of stages (empty = automatic)", show_off: "Show “Off” button", show_presets: "Show preset buttons (intensive, auto…)",
    light: "Light", cooktop: "Cooktop (sensor or switch, optional)", cooktop_threshold: "Cooking above (W)", filter: "Grease filter (sensor, optional)", filter_alert: "Warn at (%)", power: "Power sensor (optional)",
    columns: "Buttons per row", show_power: "Show power tile", hide_buttons: "Hide buttons",
    read_only: "Buttons only show the state (nothing happens on click)", show_light_switch: "Show light switch (the light still shows in the drawing)",
    sec_main: "Extractor hood", sec_extra: "Light and cooktop", sec_sensors: "Sensors", sec_layout: "Layout",
    main_hint: "Buttons are made from the fan's speed steps and presets, or from the options of a select.",
    extra_hint: "With a cooktop sensor, the drawing shows steam and hot zones while you cook.",
    yaml_buttons: "Buttons come from YAML (`buttons`) — edit them in the code editor.",
  },
  nl: {
    name: "Naam", entity: "Ventilator (fan, select met standen, of schakelaar)", stages: "Aantal standen (leeg = automatisch)", show_off: "Knop ‘Uit’ tonen", show_presets: "Preset-knoppen tonen (intensief, auto…)",
    light: "Verlichting", cooktop: "Kookplaat (sensor of schakelaar, optioneel)", cooktop_threshold: "Koken boven (W)", filter: "Vetfilter (sensor, optioneel)", filter_alert: "Waarschuwen vanaf (%)", power: "Vermogen-sensor (optioneel)",
    columns: "Knoppen per rij", show_power: "Vermogen-tegel tonen", hide_buttons: "Knoppen verbergen",
    read_only: "Knoppen tonen alleen de stand (klikken doet niets)", show_light_switch: "Lichtschakelaar tonen (het licht blijft zichtbaar in de tekening)",
    sec_main: "Afzuigkap", sec_extra: "Verlichting en kookplaat", sec_sensors: "Sensoren", sec_layout: "Weergave",
    main_hint: "De knoppen komen uit de snelheidsstappen en presets van de ventilator, of uit de opties van een select.",
    extra_hint: "Met een kookplaat-sensor toont de tekening stoom en hete zones tijdens het koken.",
    yaml_buttons: "De knoppen komen uit YAML (`buttons`) — pas ze aan in de code-editor.",
  },
};
const HDED_STYLE = `
.section { margin-top: 20px; }
.section h3 { margin: 0 0 8px; font-size: 15px; font-weight: 500; color: var(--primary-text-color); }
.hint { font-size: 12px; color: var(--secondary-text-color); margin: 0 0 10px; }
.note { font-size: 12px; color: var(--secondary-text-color); margin: 2px 0 6px; }
.note[hidden] { display: none; }
`;
const HD_FLAGS = ["show_off", "show_presets", "show_power", "show_light_switch"];

class HoodCardEditor extends HTMLElement {
  setConfig(config) { this._config = { ...config }; this._render(); }
  set hass(hass) {
    this._hass = hass;
    this.shadowRoot?.querySelectorAll("ha-form").forEach((f) => (f.hass = hass));
    if (!this._built) this._render();
  }
  _t(k) { return (HDED_TXT[hdLang(this._hass)] || HDED_TXT.en)[k] ?? HDED_TXT.en[k] ?? k; }
  _schemas() {
    const ent = (domain, extra = {}) => ({ entity: { domain, ...extra } });
    return {
      main: [
        { name: "name", selector: { text: {} } },
        { name: "entity", selector: ent(["fan", "select", "input_select", "switch", "input_boolean"]) },
        { name: "stages", selector: { number: { min: 1, max: 6, step: 1, mode: "box" } } },
        { type: "grid", name: "", schema: [{ name: "show_off", selector: { boolean: {} } }, { name: "show_presets", selector: { boolean: {} } }] },
        { name: "read_only", selector: { boolean: {} } },
      ],
      extra: [
        { name: "light", selector: ent(["light", "switch", "input_boolean"]) },
        { name: "show_light_switch", selector: { boolean: {} } },
        { type: "grid", name: "", schema: [
          { name: "cooktop", selector: ent(["sensor", "binary_sensor", "switch", "input_boolean"]) },
          { name: "cooktop_threshold", selector: { number: { min: 0, max: 5000, step: 10, mode: "box", unit_of_measurement: "W" } } },
        ] },
      ],
      sensors: [
        { type: "grid", name: "", schema: [
          { name: "filter", selector: ent(["sensor", "binary_sensor"]) },
          { name: "filter_alert", selector: { number: { min: 1, max: 100, step: 1, mode: "box", unit_of_measurement: "%" } } },
        ] },
        { name: "power", selector: ent(["sensor"]) },
      ],
      layout: [
        { name: "columns", selector: { number: { min: 1, max: 7, step: 1, mode: "slider" } } },
        { name: "show_power", selector: { boolean: {} } },
        { name: "hide_buttons", selector: { boolean: {} } },
      ],
    };
  }
  _render() {
    if (!this._config) return;
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    if (this._built) { this._update(); return; }
    this._built = true;
    const sch = this._schemas();
    const sec = (id, hint = "", extra = "") => `<div class="section"${id === "main" ? ' style="margin-top:0"' : ""}><h3>${this._t(`sec_${id}`)}</h3>${hint ? `<p class="hint">${hint}</p>` : ""}${extra}<div id="f-${id}"></div></div>`;
    this.shadowRoot.innerHTML = `<style>${HDED_STYLE}</style>
      ${sec("main", this._t("main_hint"), `<p class="note" id="yaml-note" hidden>${this._t("yaml_buttons")}</p>`)}
      ${sec("extra", this._t("extra_hint"))}
      ${sec("sensors")}
      ${sec("layout")}`;
    this._keys = {};
    this._forms = {};
    Object.keys(sch).forEach((id) => {
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
      this._keys[id].forEach((k) => { d[k] = HD_FLAGS.includes(k) ? c[k] !== false : k === "hide_buttons" || k === "read_only" ? !!c[k] : c[k]; });
      f.data = d;
    });
    this.shadowRoot.getElementById("yaml-note").hidden = !(Array.isArray(c.buttons) && c.buttons.length);
  }
  _patch(v, keys) {
    const c = { ...this._config };
    keys.forEach((k) => {
      let val = v[k];
      if (HD_FLAGS.includes(k)) val = val === false ? false : undefined;
      if (k === "hide_buttons" || k === "read_only") val = val ? true : undefined;
      if (k === "cooktop_threshold" && Number(val) === 50) val = undefined;
      if (k === "filter_alert" && Number(val) === 100) val = undefined;
      if (val === "" || val == null) delete c[k]; else c[k] = val;
    });
    const { type, ...rest } = c;
    this._config = { type, ...rest };
    this._update();
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
  }
}

customElements.define("hood-card-editor", HoodCardEditor);
customElements.define("hood-card", HoodCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "hood-card", name: "Extractor hood card", description: "Animated cooker-hood card with fan stages, intensive mode, light, cooktop steam and grease-filter warning", preview: true });
console.info(`%c HOOD-CARD %c ${HD_VERSION} `, "color:#fff;background:#29b6f6;font-weight:700", "color:#29b6f6");
