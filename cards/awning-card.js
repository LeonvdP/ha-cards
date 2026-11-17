/*
 * awning-card — animated lateral-arm awning (zonnescherm) card for Home Assistant
 * Works with open / stop / close scripts or buttons + an open/closed sensor, or with a cover entity.
 * Same design language as aircon-card and heating-card.
 */
const AW_VERSION = "1.7.0";

const FABRICS = {
  blue: ["#2f6f8f", "#eef2f4"], red: ["#b8372b", "#f3eeea"], green: ["#2e7d4f", "#eef3ee"],
  grey: ["#6f7b87", "#b5bec7"], sand: ["#cdb88f", "#f1e9d8"], anthracite: ["#3a3f45", "#5a6068"], anthracite_white: ["#3a3f45", "#f2f3f4"],
  orange: ["#e07a2b", "#f6efe6"], yellow: ["#e8b62c", "#f7f2e2"],
};
const ACTS = {
  open: { icon: "mdi:awning-outline", color: "#ffb300" },
  stop: { icon: "mdi:stop", color: "#90a4ae" },
  close: { icon: "mdi:arrow-collapse-up", color: "#78909c" },
};

const ATXT = {
  en: {
    open: "Open", stop: "Stop", close: "Close",
    s_open: "Open", s_closed: "Closed", s_partial: "Partly open", s_opening: "Extending…", s_closing: "Retracting…", s_unavailable: "Unavailable",
    position: "Position", estimated: "estimated", wind: "Wind", outdoor: "Outside", sending: "Sending…", sensor: "Sensor",
    a_wind: "Strong wind — retract the awning", a_not_closed: "Sensor still reports open after closing",
    sen_open: "Open", sen_closed: "Closed",
  },
  nl: {
    open: "Open", stop: "Stop", close: "Dicht",
    s_open: "Open", s_closed: "Dicht", s_partial: "Deels open", s_opening: "Uitrollen…", s_closing: "Inrollen…", s_unavailable: "Niet beschikbaar",
    position: "Positie", estimated: "geschat", wind: "Wind", outdoor: "Buiten", sending: "Versturen…", sensor: "Sensor",
    a_wind: "Harde wind — rol het zonnescherm in", a_not_closed: "Sensor meldt nog open na inrollen",
    sen_open: "Open", sen_closed: "Dicht",
  },
};
const ABAD = ["unavailable", "unknown", "none", ""];
const aesc = (v) => String(v ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
const aLang = (hass) => String(hass?.locale?.language || hass?.language || "en").slice(0, 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

const SVG_AWNING = (fab) => `
<defs>
<linearGradient id="ID-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe3ff" stop-opacity=".55"/><stop offset="1" stop-color="#bfe3ff" stop-opacity="0"/></linearGradient>
<linearGradient id="ID-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4efe7"/><stop offset="1" stop-color="#e3dccf"/></linearGradient>
<pattern id="ID-brick" width="10" height="5" patternUnits="userSpaceOnUse"><path d="M0 4.6h10M5 0v4.6" stroke="#d6cdbd" stroke-width=".35" fill="none"/></pattern>
<linearGradient id="ID-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9fc4dc"/><stop offset=".55" stop-color="#6e94ad"/><stop offset="1" stop-color="#4f6f84"/></linearGradient>
<linearGradient id="ID-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9c2b6"/><stop offset="1" stop-color="#a9a194"/></linearGradient>
<linearGradient id="ID-cas" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#e3e7eb"/><stop offset="1" stop-color="#b9c1c9"/></linearGradient>
<pattern id="ID-stripes" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="${fab[1]}"/><rect width="5" height="10" fill="${fab[0]}"/></pattern>
<linearGradient id="ID-shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset=".35" stop-color="#000" stop-opacity=".05"/><stop offset="1" stop-color="#fff" stop-opacity=".08"/></linearGradient>
<radialGradient id="ID-sunglow"><stop offset="0" stop-color="#ffd54f" stop-opacity=".55"/><stop offset="1" stop-color="#ffd54f" stop-opacity="0"/></radialGradient>
</defs>
<rect x="0" y="0" width="120" height="30" fill="url(#ID-sky)"/>
<g class="aw-sun"><circle cx="104" cy="11" r="11" fill="url(#ID-sunglow)"/><g class="aw-rays" stroke="#ffc107" stroke-width="1.1" stroke-linecap="round">
  <path d="M104 2.5v2M104 17.5v2M95.5 11h2M110.5 11h2M98 5l1.4 1.4M108.6 15.6l1.4 1.4M98 17l1.4-1.4M108.6 6.4l1.4-1.4"/></g>
  <circle cx="104" cy="11" r="4" fill="#ffca28"/></g>
<rect x="4" y="18" width="112" height="90" fill="url(#ID-wall)"/>
<rect x="4" y="18" width="112" height="90" fill="url(#ID-brick)" opacity=".8"/>
<rect class="aw-sunpatch" x="4" y="34" width="112" height="74" fill="#ffe7a3"/>
<g><rect x="16" y="50" width="34" height="34" rx="1" fill="#f8f8f6" stroke="#cfc6b6" stroke-width=".6"/><rect x="18.5" y="52.5" width="29" height="29" fill="url(#ID-glass)"/>
  <path d="M33 52.5v29M18.5 67h29" stroke="#f8f8f6" stroke-width="1.6"/><path d="M20 79l9-12" stroke="#fff" stroke-opacity=".35" stroke-width="1.6"/></g>
<g><rect x="64" y="44" width="38" height="64" rx="1" fill="#f8f8f6" stroke="#cfc6b6" stroke-width=".6"/><rect x="66.5" y="46.5" width="15.5" height="61.5" fill="url(#ID-glass)"/><rect x="84" y="46.5" width="15.5" height="61.5" fill="url(#ID-glass)"/>
  <path d="M68 104l12-30M85.5 104l12-30" stroke="#fff" stroke-opacity=".3" stroke-width="1.6"/></g>
<rect x="0" y="106" width="120" height="34" fill="url(#ID-floor)"/>
<path d="M0 106h120M0 116h120M0 128h120" stroke="#9c9486" stroke-width=".4"/>
<path class="aw-shadow" fill="#000"/>
<path class="aw-fabric" fill="url(#ID-stripes)"/>
<path class="aw-fabric-sh" fill="url(#ID-shade)"/>
<path class="aw-val" fill="url(#ID-stripes)" stroke="#000" stroke-opacity=".12" stroke-width=".3"/>
<rect class="aw-bar" height="3" rx="1.2" fill="#dfe4e8" stroke="#9aa3ad" stroke-width=".4"/>
<rect x="8" y="24" width="104" height="8" rx="3" fill="url(#ID-cas)" stroke="#9aa3ad" stroke-width=".5"/>
<path d="M11 30.5h98" stroke="#fff" stroke-opacity=".8" stroke-width=".6"/>
<circle class="aw-led" cx="106" cy="28" r="1.1"/>
<g class="aw-wind" fill="none" stroke="#90a4ae" stroke-width="1" stroke-linecap="round"><path d="M6 12h14q4 0 4-3t-3-3"/><path d="M4 17h20q3 0 3 2.5t-2.5 2.5"/></g>`;

const ASTYLE = `
:host {
  --aw-sun: #ffb300;
  --aw-off: var(--disabled-text-color, #9aa3ad);
  --aw-alert: var(--error-color, #db4437);
  display: block; height: 100%;
}
:host([paused]) *, :host([paused]) *::before, :host([paused]) *::after { animation-play-state: paused !important; }
ha-card { height: 100%; overflow: hidden; container-type: inline-size; position: relative; }
ha-card::before {
  content: ""; position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 1s, background 1s;
  background: radial-gradient(120% 90% at 0% 0%, color-mix(in srgb, var(--c) 18%, transparent), transparent 60%);
}
ha-card.on::before { opacity: 1; }
.wrap { --c: var(--aw-off); padding: 14px; display: flex; flex-direction: column; gap: 12px; position: relative; }
.top { display: grid; grid-template-columns: auto minmax(0,1fr); column-gap: 14px; row-gap: 10px; align-items: start; }
.illus {
  width: var(--aircon-illustration-size, 116px); aspect-ratio: 120/140; border-radius: 16px; padding: 4px; box-sizing: content-box; cursor: pointer;
  grid-row: span 2;
  background: radial-gradient(circle at 50% 40%, rgba(127,127,127,.10), rgba(127,127,127,.03) 70%);
  transition: box-shadow .8s;
}
.on .illus { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 25%, transparent); }
svg { width: 100%; height: 100%; display: block; overflow: visible; }
/* the awning is a full scene (sky, wall, terrace), not an object on the tile: let it fill the rounded tile edge to edge */
.illus { position: relative; overflow: hidden; }
.illus > svg { width: calc(100% + 8px); height: calc(100% + 8px); margin: -4px; }
.illus::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; transition: box-shadow .8s;
  box-shadow: inset 0 0 0 1px rgba(127,127,127,.22); }
.on .illus::after { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 45%, transparent); }
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
  --mc: var(--aw-off);
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
.controls.closed .cin { visibility: hidden; }
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

.wrap { --c: var(--aw-off); }
.wrap.s-open, .wrap.s-partial, .wrap.s-opening, .wrap.s-closing { --c: var(--aw-sun); }
.alert { display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; color: var(--aw-alert); }
.alert ha-icon { --mdc-icon-size: 15px; flex: none; }
.alert[hidden] { display: none; }
.mode { --mt: #fff; }
.mode[data-act=open] { --mt: #2a1a05; }
.mode.moving::before { content: ""; position: absolute; left: 0; bottom: 0; height: 3px; width: var(--prog, 0%); background: color-mix(in srgb, var(--mt) 45%, transparent); transition: width .2s linear; }
.pos { flex: 1; display: flex; align-items: center; gap: 10px; min-width: 0; }
.pbar { flex: 1; height: 8px; border-radius: 4px; background: rgba(127,127,127,.2); overflow: hidden; position: relative; }
.pfill { position: absolute; inset: 0 auto 0 0; width: 0; border-radius: 4px; background: var(--c); transition: background .4s; }
.moving-now .pfill { background-image: linear-gradient(90deg, transparent, rgba(255,255,255,.4), transparent); background-size: 40px 100%; animation: shimmer 1s linear infinite; background-color: var(--c); }
.pval { font-size: 15px; font-weight: 600; min-width: 46px; text-align: right; color: var(--primary-text-color); font-variant-numeric: tabular-nums; padding-right: 6px; }
.est { font-size: 10.5px; color: var(--secondary-text-color); margin-left: 4px; }

/* ---- illustration ---- */
.aw-sunpatch { opacity: 0; transition: opacity 1s; }
.s-closed .aw-sunpatch { opacity: .18; }
.aw-sun { transition: opacity .6s; }
.aw-rays { transform-box: fill-box; transform-origin: center; animation: spin 18s linear infinite; }
.s-unavailable .illus { opacity: .5; filter: grayscale(1); }
.aw-led { fill: #5a636d; }
.moving-now .aw-led { fill: var(--aw-sun); animation: blink .6s steps(2, start) infinite; }
.aw-wind { opacity: 0; transition: opacity .5s; }
.windy .aw-wind { opacity: 1; animation: gust 1.6s ease-in-out infinite; }
.aw-val { transform-box: fill-box; transform-origin: top center; }
.windy .aw-val { animation: flutter .5s ease-in-out infinite alternate; }
.windy .aw-fabric { animation: billow 1.1s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: top center; }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes blink { to { visibility: hidden; } }
@keyframes shimmer { from { background-position: -40px 0; } to { background-position: 200px 0; } }
@keyframes gust { 0%,100% { transform: translateX(0); opacity: .9; } 50% { transform: translateX(4px); opacity: .5; } }
@keyframes flutter { from { transform: skewX(-4deg); } to { transform: skewX(4deg); } }
@keyframes billow { from { transform: scaleY(1); } to { transform: scaleY(.97); } }
`;

class AwningCard extends HTMLElement {
  static async getConfigElement() {
    if (!customElements.get("ha-form") || !customElements.get("ha-entity-picker")) {
      try {
        const helpers = await window.loadCardHelpers?.();
        const tile = await helpers?.createCardElement({ type: "tile", entity: "sun.sun" });
        await tile?.constructor?.getConfigElement?.();
      } catch (e) { /* ignore */ }
    }
    return document.createElement("awning-card-editor");
  }

  static getStubConfig(hass) {
    const ids = Object.keys(hass?.states || {});
    const re = /zonnescherm|awning|markies|scherm/;
    const find = (doms, r2) => ids.find((e) => doms.includes(e.split(".")[0]) && re.test(e) && (!r2 || r2.test(e)));
    const cfg = { name: "Zonnescherm", travel_time: 45 };
    const cover = find(["cover"]);
    if (cover) cfg.entity = cover;
    const st = find(["binary_sensor", "sensor"]);
    if (st) cfg.status_entity = st;
    const btn = ["script", "button", "input_button", "scene"];
    const o = find(btn, /open|uit/), s = find(btn, /stop/), c = find(btn, /dicht|close|sluit|in$|_in_/);
    if (o) cfg.open = o; if (s) cfg.stop = s; if (c) cfg.close = c;
    return cfg;
  }

  setConfig(config) {
    if (!config) throw new Error("Invalid configuration");
    this._config = { travel_time: 45, ...config };
    this._key = `awning-card:${config.storage_key || config.name || config.status_entity || config.entity || "default"}`;
    this._built = false;
    this._ids = null;
    this._load();
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
  connectedCallback() { this._observe(); if (this._mem?.motion) this._loop(); }
  disconnectedCallback() { cancelAnimationFrame(this._raf); this._raf = null; this._io?.disconnect(); this._io = null; }
  getCardSize() { return 5; }
  getGridOptions() { return { columns: 12, min_columns: 6, rows: "auto" }; }

  _t(k) { return (ATXT[aLang(this._hass)] || ATXT.en)[k] ?? ATXT.en[k] ?? k; }
  _st(id) { return id ? this._hass.states[id] : undefined; }
  _num(id) {
    const s = this._st(id);
    if (!s || ABAD.includes(String(s.state).toLowerCase())) return null;
    const n = Number(s.state);
    return Number.isFinite(n) ? n : null;
  }
  _fmt(v, unit, dec = 1) {
    if (v == null) return "—";
    const n = Number(v).toLocaleString(this._hass?.locale?.language || undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
    return `${n}${unit ? (unit === "%" || unit.startsWith("°") ? "" : " ") + unit : ""}`;
  }
  // travel_time = full open run; close_time = full close run (defaults to travel_time)
  _T(dir = 1) {
    const open = Number(this._config.travel_time) || 45;
    return Math.max(3, dir < 0 ? Number(this._config.close_time) || open : open) * 1000;
  }

  // ---------- position memory (per browser) ----------
  _load() {
    try { this._mem = JSON.parse(localStorage.getItem(this._key)) || null; } catch (e) { this._mem = null; }
    if (!this._mem || typeof this._mem.p !== "number") this._mem = { p: 0, motion: null };
  }
  _save() { try { localStorage.setItem(this._key, JSON.stringify(this._mem)); } catch (e) { /* ignore */ } }
  _estimate(now = Date.now()) {
    const m = this._mem.motion;
    if (!m) return { p: this._mem.p, moving: 0, done: false };
    const p = clamp01(m.from + (m.dir * (now - m.t0)) / this._T(m.dir));
    const done = m.dir > 0 ? p >= 1 : p <= 0;
    return { p, moving: m.dir, done };
  }
  _settle(p) { this._mem = { p: clamp01(p), motion: null, stoppedAt: this._mem.stoppedAt }; this._save(); }

  // sensor → "open" | "closed" | null
  _sensor() {
    const id = this._config.status_entity, s = this._st(id);
    if (!s || ABAD.includes(String(s.state).toLowerCase())) return null;
    const v = String(s.state).toLowerCase();
    let open = null;
    if (["on", "open", "opened", "opening", "geopend", "uit", "out", "true"].includes(v)) open = true;
    else if (["off", "closed", "close", "closing", "dicht", "gesloten", "in", "false"].includes(v)) open = false;
    if (open === null) return null;
    if (this._config.invert_status) open = !open;
    return open ? "open" : "closed";
  }

  _resolve() {
    const c = this._config, now = Date.now();
    const cover = c.entity && c.entity.startsWith("cover.") ? this._st(c.entity) : null;
    const r = { alerts: [], estimated: true };
    if (c.entity && (!cover || ABAD.includes(String(cover.state).toLowerCase()))) { r.status = "unavailable"; r.p = this._mem.p; return r; }
    if (cover && cover.attributes.current_position != null) {
      // real position from the cover
      r.estimated = false;
      r.p = cover.attributes.current_position / 100;
      r.status = cover.state === "opening" ? "opening" : cover.state === "closing" ? "closing" : r.p <= 0.01 ? "closed" : r.p >= 0.99 ? "open" : "partial";
    } else {
      const sen = this._sensor() ?? (cover ? (["open", "opening"].includes(cover.state) ? "open" : "closed") : null);
      if (cover && ["opening", "closing"].includes(cover.state) && !this._mem.motion) {
        this._mem.motion = { dir: cover.state === "opening" ? 1 : -1, from: this._mem.p, t0: now }; this._save(); this._loop();
      }
      let e = this._estimate(now);
      const m = this._mem.motion;
      if (m && m.dir < 0 && sen === "closed" && now - m.t0 > 1500) { this._settle(0); e = { p: 0, moving: 0 }; }
      else if (e.done) {
        this._settle(e.p);
        if (m.dir < 0) this._mem.closeDoneAt = now;
        e = { p: e.p, moving: 0 };
      }
      if (!e.moving) {
        if (sen === "closed") { if (this._mem.p !== 0) this._settle(0); e.p = 0; this._mem.closeDoneAt = null; }
        else if (sen === "open" && e.p <= 0.01) {
          // opened elsewhere (remote control) or close didn't finish
          const since = this._mem.closeDoneAt ? now - this._mem.closeDoneAt : null;
          if (since != null && since < 15000) { e.moving = -1; e.p = 0.02; if (!this._graceT) this._graceT = setTimeout(() => { this._graceT = null; this._render(); }, 15100 - since); }
          else if (since != null && since < 10 * 60 * 1000) { r.alerts.push("not_closed"); e.p = 0.06; }
          else { this._settle(1); e.p = 1; }
        }
      }
      r.p = e.p;
      r.status = e.moving > 0 ? "opening" : e.moving < 0 ? "closing" : r.p <= 0.01 ? "closed" : r.p >= 0.99 ? "open" : "partial";
      r.sensor = sen;
      r.hasPosition = !!c.travel_time || true;
    }
    const wind = this._num(c.wind);
    r.wind = wind;
    if (wind != null && wind >= (c.wind_max ?? 30) && r.status !== "closed") r.alerts.push("wind");
    r.windy = wind != null && wind >= (c.wind_max ?? 30);
    return r;
  }

  // ---------- drawing ----------
  _draw(p) {
    const sr = this.shadowRoot;
    if (!sr || !sr.querySelector(".aw-fabric")) return;
    if (!this._els || this._els.root !== sr.firstElementChild) {
      const g = (x) => sr.querySelector(x);
      this._els = { root: sr.firstElementChild, btn: { open: g(".mode[data-act=open]"), close: g(".mode[data-act=close]") } };
      [".aw-fabric", ".aw-fabric-sh", ".aw-bar", ".aw-val", ".aw-shadow", ".aw-sunpatch"].forEach((k) => (this._els[k] = g(k)));
      this._els.pfill = sr.getElementById("pfill"); this._els.pval = sr.getElementById("pval");
    }
    const E = this._els;
    const Y0 = 31, Y = Y0 + p * 42, e = p * 7, x0 = 10 - e, x1 = 110 + e;
    const q = (k) => E[k];
    q(".aw-fabric").setAttribute("d", `M10 ${Y0}H110L${x1} ${Y}H${x0}Z`);
    q(".aw-fabric-sh").setAttribute("d", `M10 ${Y0}H110L${x1} ${Y}H${x0}Z`);
    const bar = q(".aw-bar");
    bar.setAttribute("x", x0 - 1); bar.setAttribute("y", Y - 1); bar.setAttribute("width", x1 - x0 + 2);
    const n = 10, w = (x1 - x0) / n, vh = 2 + p * 4;
    let d = `M${x0} ${Y + 1.6}H${x1}V${Y + 1.6 + vh}`;
    for (let i = 0; i < n; i++) d += `q${(-w / 2).toFixed(2)} 3 ${(-w).toFixed(2)} 0`;
    q(".aw-val").setAttribute("d", `${d}Z`);
    q(".aw-val").style.opacity = p < 0.02 ? 0 : 1;
    // shadow on the terrace
    const sy = 106 + p * 23;
    q(".aw-shadow").setAttribute("d", `M${4 + 10 * (1 - p)} 106H${116 - 10 * (1 - p)}L${120} ${sy}H0Z`);
    q(".aw-shadow").style.opacity = (0.22 * p).toFixed(3);
    // sunlight on the wall fades as the awning comes out
    q(".aw-sunpatch").style.opacity = ((1 - p) * 0.18).toFixed(3);
    // position panel
    const pv = Math.round(p * 100);
    if (E.pfill) E.pfill.style.width = `${pv}%`;
    if (E.pval) E.pval.textContent = `${pv}%`;
  }

  _loop() {
    if (this._raf || !this.isConnected) return;
    let lastDraw = 0, lastRender = 0;
    const step = (ts) => {
      if (!this._mem.motion) { this._raf = null; this._render(); return; }
      if (ts - lastDraw >= 33 && !this.hasAttribute("paused")) { // ~30 fps is plenty for a slow awning
        lastDraw = ts;
        const e = this._estimate();
        this._draw(e.p);
        const m = this._mem.motion;
        const btn = this._els?.btn[m.dir > 0 ? "open" : "close"];
        if (btn) btn.style.setProperty("--prog", `${Math.round((m.dir > 0 ? e.p : 1 - e.p) * 100)}%`);
      }
      if (ts - lastRender > 500) { lastRender = ts; this._render(); }
      this._raf = this._mem.motion ? requestAnimationFrame(step) : null;
      if (!this._raf) this._render();
    };
    this._raf = requestAnimationFrame(step);
  }


  // ---------- render ----------
  _build() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    const c = this._config, uid = `aw${Math.random().toString(36).slice(2, 8)}`;
    const fab = Array.isArray(c.fabric) ? c.fabric : FABRICS[c.fabric] || (c.fabric_color ? [c.fabric_color, "#f1f1ef"] : FABRICS.blue);
    const acts = ["open", "stop", "close"];
    this.shadowRoot.innerHTML = `
      <style>${ASTYLE}</style>
      <ha-card>
        <div class="wrap" id="wrap">
          <div class="top">
            <div class="illus" id="illus"><svg viewBox="0 0 120 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${SVG_AWNING(fab).replace(/ID-/g, `${uid}-`)}</svg></div>
            <div class="head" id="head">
              <div class="name" id="name"></div>
              <div class="status"><span class="dot"></span><span class="txt" id="status"></span></div>
              <div class="alert" id="alert" hidden><ha-icon icon="mdi:alert-circle"></ha-icon><span id="alert-t"></span></div>
            </div>
            <div class="stats" id="stats"></div>
          </div>
          <div class="modes" id="modes" style="--n:3">
            ${acts.map((a) => {
              const b = (typeof c[`${a}_button`] === "object" && c[`${a}_button`]) || {};
              return `<button class="mode" data-act="${a}" style="--mc:${aesc(b.color || ACTS[a].color)}">
                <ha-icon icon="${aesc(b.icon || ACTS[a].icon)}"></ha-icon><span class="ml">${aesc(b.name || this._t(a))}</span></button>`;
            }).join("")}
          </div>
          <div class="controls" id="controls"><div class="cin">
            <div class="crow" id="r-pos">
              <ha-icon icon="mdi:arrow-expand-down"></ha-icon>
              <span class="tl" style="flex:none">${this._t("position")}<span class="est" id="est">(${this._t("estimated")})</span></span>
              <span class="pos"><span class="pbar"><span class="pfill" id="pfill"></span></span><span class="pval" id="pval"></span></span>
            </div>
          </div></div>
        </div>
      </ha-card>`;
    const $ = (id) => this.shadowRoot.getElementById(id);
    if (c.hide_buttons) $("modes").style.display = "none";
    if (c.show_position === false) $("controls").style.display = "none";
    $("modes").addEventListener("click", (ev) => {
      const el = ev.target.closest(".mode");
      if (!el) return;
      this._ripple(el, ev);
      this._press(el.dataset.act, el);
    });
    const more = () => this._moreInfo(c.entity || c.status_entity);
    $("illus").addEventListener("click", () => (c.tap_action ? this._runAction(c.tap_action) : more()));
    $("head").addEventListener("click", more);
    $("stats").addEventListener("click", (ev) => { const t = ev.target.closest("[data-entity]"); if (t) this._moreInfo(t.dataset.entity); });
    this._built = true;
  }

  _render() {
    if (!this._built) this._build();
    const c = this._config, r = this._resolve();
    const $ = (id) => this.shadowRoot.getElementById(id);
    const moving = r.status === "opening" || r.status === "closing";
    $("wrap").className = `wrap s-${r.status} ${["open", "partial", "opening", "closing"].includes(r.status) ? "on" : ""} ${moving ? "moving-now" : ""} ${r.windy ? "windy" : ""}`;
    this.shadowRoot.querySelector("ha-card").classList.toggle("on", r.status !== "closed" && r.status !== "unavailable");
    $("name").textContent = c.name || this._st(c.entity)?.attributes?.friendly_name || "Zonnescherm";
    let status = this._busyLabel || this._t(`s_${r.status}`);
    if (!this._busyLabel && r.status === "partial") status += ` · ${Math.round(r.p * 100)}%`;
    $("status").textContent = status;
    $("alert").hidden = !r.alerts.length;
    $("alert-t").textContent = r.alerts.map((a) => this._t(`a_${a}`)).join(" · ");
    $("est").hidden = !r.estimated;
    // position panel: only while the awning is out or moving
    $("controls").classList.toggle("closed", ["closed", "unavailable"].includes(r.status));
    if (!this._raf) this._draw(r.p);

    const tiles = [];
    if (c.status_entity && c.show_sensor !== false) {
      const sen = this._sensor();
      tiles.push({ e: c.status_entity, icon: sen === "closed" ? "mdi:awning-outline" : "mdi:awning", lbl: this._t("sensor"),
        v: sen ? this._t(`sen_${sen}`) : this._hass.formatEntityState ? this._hass.formatEntityState(this._st(c.status_entity)) : this._st(c.status_entity)?.state ?? "—" });
    }
    if (c.wind) tiles.push({ e: c.wind, icon: "mdi:weather-windy", lbl: this._t("wind"), v: this._fmt(r.wind, this._st(c.wind)?.attributes?.unit_of_measurement || "km/h", 0), warn: r.windy });
    if (c.temperature) tiles.push({ e: c.temperature, icon: "mdi:thermometer", lbl: this._t("outdoor"), v: this._fmt(this._num(c.temperature), this._st(c.temperature)?.attributes?.unit_of_measurement || "°C") });
    (c.tiles || []).forEach((t) => {
      const id = typeof t === "string" ? t : t.entity, s = this._st(id);
      if (!s) return;
      const n = Number(s.state), u = s.attributes.unit_of_measurement;
      tiles.push({ e: id, icon: t.icon || s.attributes.icon || "mdi:information-outline", lbl: t.name || s.attributes.friendly_name || id,
        v: Number.isFinite(n) ? this._fmt(n, u, t.decimals ?? (Number.isInteger(n) ? 0 : 1)) : this._hass.formatEntityState ? this._hass.formatEntityState(s) : s.state });
    });
    const th = tiles.map((t) => `<div class="tile" data-entity="${aesc(t.e || "")}" ${t.warn ? 'style="color:var(--aw-alert)"' : ""}><span class="val" ${t.warn ? 'style="color:var(--aw-alert)"' : ""}>${aesc(t.v)}</span><span class="lbl"><ha-icon icon="${t.icon}"></ha-icon>${aesc(t.lbl)}</span></div>`).join("");
    if (th !== this._tilesHtml) { $("stats").innerHTML = th; this._tilesHtml = th; }

    // buttons: highlight what the awning is doing / where it is
    const active = r.status === "opening" || r.status === "open" ? "open" : r.status === "closing" || r.status === "closed" ? "close" : r.status === "partial" ? "stop" : null;
    this.shadowRoot.querySelectorAll(".mode").forEach((el) => {
      const a = el.dataset.act;
      el.classList.toggle("active", a === active);
      el.classList.toggle("moving", (a === "open" && r.status === "opening") || (a === "close" && r.status === "closing"));
      if (!el.classList.contains("moving")) el.style.removeProperty("--prog");
    });
    if (moving && r.estimated) this._loop();
  }

  // ---------- actions ----------
  _ripple(el, ev) {
    const r = el.getBoundingClientRect(), d = Math.max(r.width, r.height);
    const s = document.createElement("span");
    s.className = "ripple";
    s.style.cssText = `width:${d}px;height:${d}px;left:${(ev.clientX || r.left + r.width / 2) - r.left - d / 2}px;top:${(ev.clientY || r.top + r.height / 2) - r.top - d / 2}px`;
    el.appendChild(s);
    setTimeout(() => s.remove(), 650);
  }

  async _call(target) {
    if (!target) return;
    if (typeof target === "object") return this._runAction(target);
    const dom = String(target).split(".")[0];
    const svc = { script: "turn_on", scene: "turn_on", button: "press", input_button: "press", automation: "trigger", switch: "turn_on", input_boolean: "turn_on" }[dom];
    if (!svc) return this._hass.callService("homeassistant", "turn_on", { entity_id: target });
    return this._hass.callService(dom, svc, { entity_id: target });
  }

  async _press(act, el) {
    const c = this._config;
    const cover = c.entity && c.entity.startsWith("cover.");
    const target = c[act] || (typeof c[`${act}_button`] === "object" ? c[`${act}_button`].action && c[`${act}_button`] : null);
    el.classList.add("busy");
    this._busyLabel = this._t("sending");
    this._render();
    try {
      if (target) await this._call(target);
      else if (cover) await this._hass.callService("cover", { open: "open_cover", stop: "stop_cover", close: "close_cover" }[act], { entity_id: c.entity });
      // update the position estimate
      const e = this._estimate();
      if (act === "stop") { this._settle(e.p); }
      else {
        const dir = act === "open" ? 1 : -1;
        if ((dir > 0 && e.p < 1) || (dir < 0 && e.p > 0) || this._sensor() === "open") {
          this._mem = { p: e.p, motion: { dir, from: dir < 0 && e.p <= 0 ? 0.06 : e.p, t0: Date.now() } };
          this._save();
        }
        this._mem.closeDoneAt = null;
      }
    } catch (err) {
      console.error("awning-card:", err);
    } finally {
      setTimeout(() => { el.classList.remove("busy"); this._busyLabel = null; this._render(); this._loop(); }, 500);
    }
  }

  async _runAction(a) {
    const type = a.action;
    if (type === "more-info") return this._moreInfo(a.entity || this._config.entity || this._config.status_entity);
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
const AED_TXT = {
  en: {
    name: "Name", status_entity: "Open/closed sensor", invert_status: "Invert sensor (on = closed)", entity: "Cover entity (optional)",
    open: "Open: script / button", stop: "Stop: script / button", close: "Close: script / button",
    travel_time: "Opening time: closed → open (seconds)", close_time: "Closing time: open → closed (seconds)", fabric: "Fabric colour",
    wind: "Wind speed sensor (optional)", wind_max: "Wind warning from", temperature: "Outdoor temperature sensor (optional)",
    show_sensor: "Show sensor tile", show_position: "Show (estimated) position", hide_buttons: "Hide buttons",
    sec_main: "Awning", sec_buttons: "Buttons", sec_motion: "Movement & look", sec_sensors: "Sensors", sec_layout: "Layout",
    btn_hint: "Pick the script, button or scene that each button should run. Leave empty to use the cover entity.",
    motion_hint: "The sensor only knows open or closed, so the card estimates the position from the travel time. Time a full open run and a full close run once and fill them in.",
    blue: "Blue / white", red: "Red / white", green: "Green / white", grey: "Grey", sand: "Sand", anthracite: "Anthracite", anthracite_white: "Anthracite / white", orange: "Orange / white", yellow: "Yellow / white",
  },
  nl: {
    name: "Naam", status_entity: "Open/dicht-sensor", invert_status: "Sensor omkeren (aan = dicht)", entity: "Cover-entiteit (optioneel)",
    open: "Open: script / knop", stop: "Stop: script / knop", close: "Dicht: script / knop",
    travel_time: "Looptijd uitrollen: dicht → open (seconden)", close_time: "Looptijd inrollen: open → dicht (seconden)", fabric: "Doekkleur",
    wind: "Windsnelheid-sensor (optioneel)", wind_max: "Windwaarschuwing vanaf", temperature: "Buitentemperatuur-sensor (optioneel)",
    show_sensor: "Sensor-tegel tonen", show_position: "(Geschatte) positie tonen", hide_buttons: "Knoppen verbergen",
    sec_main: "Zonnescherm", sec_buttons: "Knoppen", sec_motion: "Beweging & uiterlijk", sec_sensors: "Sensoren", sec_layout: "Weergave",
    btn_hint: "Kies per knop het script, de knop of de scène die uitgevoerd moet worden. Leeg = de cover-entiteit gebruiken.",
    motion_hint: "De sensor kent alleen open of dicht; de kaart schat de positie op basis van de looptijd. Klok één keer hoe lang helemaal uitrollen en helemaal inrollen duurt en vul beide tijden in.",
    blue: "Blauw / wit", red: "Rood / wit", green: "Groen / wit", grey: "Grijs", sand: "Zand", anthracite: "Antraciet", anthracite_white: "Antraciet / wit", orange: "Oranje / wit", yellow: "Geel / wit",
  },
};
const AED_STYLE = `
.section { margin-top: 20px; } .section:first-child { margin-top: 0; }
.section h3 { margin: 0 0 8px; font-size: 15px; font-weight: 500; color: var(--primary-text-color); }
.hint { font-size: 12px; color: var(--secondary-text-color); margin: 0 0 10px; }
`;

class AwningCardEditor extends HTMLElement {
  setConfig(config) { this._config = { ...config }; this._render(); }
  set hass(hass) {
    this._hass = hass;
    this.shadowRoot?.querySelectorAll("ha-form").forEach((f) => (f.hass = hass));
    if (!this._built) this._render();
  }
  _t(k) { return (AED_TXT[aLang(this._hass)] || AED_TXT.en)[k] ?? AED_TXT.en[k] ?? k; }
  _schemas() {
    const run = { entity: { domain: ["script", "button", "input_button", "scene", "switch", "automation"] } };
    return {
      main: [
        { name: "name", selector: { text: {} } },
        { name: "status_entity", selector: { entity: { domain: ["binary_sensor", "sensor"] } } },
        { name: "invert_status", selector: { boolean: {} } },
        { name: "entity", selector: { entity: { domain: "cover" } } },
      ],
      buttons: [{ name: "open", selector: run }, { name: "stop", selector: run }, { name: "close", selector: run }],
      motion: [
        { name: "travel_time", selector: { number: { min: 3, max: 240, step: 1, mode: "box", unit_of_measurement: "s" } } },
        { name: "close_time", selector: { number: { min: 3, max: 240, step: 1, mode: "box", unit_of_measurement: "s" } } },
        { name: "fabric", selector: { select: { mode: "dropdown", options: Object.keys(FABRICS).map((k) => ({ value: k, label: this._t(k) })) } } },
      ],
      sensors: [
        { name: "wind", selector: { entity: { domain: "sensor" } } },
        { name: "wind_max", selector: { number: { min: 5, max: 100, step: 1, mode: "box", unit_of_measurement: "km/h" } } },
        { name: "temperature", selector: { entity: { domain: "sensor", device_class: "temperature" } } },
      ],
      layout: [{ name: "show_sensor", selector: { boolean: {} } }, { name: "show_position", selector: { boolean: {} } }, { name: "hide_buttons", selector: { boolean: {} } }],
    };
  }
  _render() {
    if (!this._config) return;
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    if (!this._built) {
      this._built = true;
      const sch = this._schemas();
      const sec = (id, hint) => `<div class="section"><h3>${this._t(`sec_${id}`)}</h3>${hint ? `<p class="hint">${this._t(hint)}</p>` : ""}<div id="f-${id}"></div></div>`;
      this.shadowRoot.innerHTML = `<style>${AED_STYLE}</style>${sec("main")}${sec("buttons", "btn_hint")}${sec("motion", "motion_hint")}${sec("sensors")}${sec("layout")}`;
      this._forms = {};
      Object.keys(sch).forEach((k) => {
        const f = document.createElement("ha-form");
        f.hass = this._hass; f.schema = sch[k]; f.data = {};
        f.computeLabel = (s) => this._t(s.name);
        const keys = sch[k].map((s) => s.name);
        f.addEventListener("value-changed", (ev) => { ev.stopPropagation(); this._patch(ev.detail.value, keys); });
        this.shadowRoot.getElementById(`f-${k}`).appendChild(f);
        this._forms[k] = f;
      });
    }
    const c = this._config, pick = (keys) => Object.fromEntries(keys.map((k) => [k, c[k]]));
    this._forms.main.data = { ...pick(["name", "status_entity", "entity"]), invert_status: !!c.invert_status };
    this._forms.buttons.data = Object.fromEntries(["open", "stop", "close"].map((k) => [k, typeof c[k] === "string" ? c[k] : undefined]));
    this._forms.motion.data = { travel_time: c.travel_time ?? 45, close_time: c.close_time ?? c.travel_time ?? 45, fabric: typeof c.fabric === "string" ? c.fabric : "blue" };
    this._forms.sensors.data = { wind: c.wind, wind_max: c.wind_max ?? 30, temperature: c.temperature };
    this._forms.layout.data = { show_sensor: c.show_sensor !== false, show_position: c.show_position !== false, hide_buttons: !!c.hide_buttons };
  }
  _patch(v, keys) {
    const c = { ...this._config };
    keys.forEach((k) => {
      let val = v[k];
      if (["open", "stop", "close"].includes(k) && typeof c[k] === "object" && (val === "" || val == null)) return; // keep YAML actions
      if (k === "invert_status" || k === "hide_buttons") val = val ? true : undefined;
      if (k === "show_position" || k === "show_sensor") val = val === false ? false : undefined;
      if (k === "fabric" && val === "blue" && !c.fabric) val = undefined;
      // not set yet and not touched (still shows the old or new opening time): keep following the opening time
      if (k === "close_time" && this._config.close_time == null && [this._config.travel_time ?? 45, v.travel_time].map(Number).includes(Number(val))) val = undefined;
      if (k === "wind_max" &&(val === 30 || !c.wind)) val = undefined;
      if (val === "" || val == null) delete c[k]; else c[k] = val;
    });
    const { type, ...rest } = c;
    this._config = { type, ...rest };
    this._render();
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
  }
}

customElements.define("awning-card-editor", AwningCardEditor);
customElements.define("awning-card", AwningCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "awning-card", name: "Awning card", description: "Animated lateral-arm awning (zonnescherm) with open / stop / close and position estimate", preview: true });
console.info(`%c AWNING-CARD %c ${AW_VERSION} `, "color:#2a1a05;background:#ffb300;font-weight:700", "color:#ffb300");
