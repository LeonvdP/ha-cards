/*
 * waste-card — animated waste-collection card ("afvalkalender") for Home Assistant
 * Made for the Afvalwijzer integration (xirixiz/homeassistant-afvalwijzer): one sensor per waste type whose state is
 * the next collection date ("2026-11-20", or a full timestamp), or "geen" when there is none. Works with any sensor
 * that holds a date. Each container gets its own body and lid colour.
 * Same design language as the other cards.
 */
const WS_VERSION = "1.0.0";

const WS_COLORS = { gray: "#7b858f", green: "#3f9b4a", brown: "#8a5a3c", blue: "#2f7fd1", orange: "#f08a24" };
// waste type (from the entity id) → translation key and default body / lid colour
const WS_TYPES = [
  [/gft|groente|bio|organic|food/, "gft", "green", "green"],
  [/pmd|plastic|pbd|verpakking/, "pmd", "gray", "orange"],
  [/papier|paper|karton|cardboard/, "papier", "blue", "blue"],
  [/rest/, "restafval", "gray", "gray"],
  [/textiel|textile|kleding/, "textiel", "gray", "brown"],
  [/kca|chemisch|chemical/, "kca", "gray", "gray"],
  [/snoei|tuin|garden|groen|pruning/, "snoeiafval", "brown", "green"],
  [/glas|glass/, "glas", "green", "gray"],
  [/kerst|christmas/, "kerstbomen", "green", "brown"],
  [/milieustraat|recycl/, "milieustraat", "gray", "gray"],
];
const WTXT = {
  en: {
    dev_name: "Waste collection", gft: "Organic", pmd: "PMD", papier: "Paper", restafval: "Residual", textiel: "Textiles", kca: "Chemical waste",
    snoeiafval: "Pruning waste", glas: "Glass", kerstbomen: "Christmas trees", milieustraat: "Recycling centre",
    today: "Today", tomorrow: "Tomorrow", in_days: "In {n} days", days: "{n} days", and: "and",
    s_today: "Today: {w}", s_tomorrow: "Tomorrow: {w}", s_later: "In {n} days: {w}", s_none: "No collections planned", s_unavailable: "Unavailable",
    put_out: "put it out tonight", collection: "Collection day", countdown: "To go", pickup: "Pick-up", no_date: "No date",
    notif: "{n} message", notifs: "{n} messages",
  },
  nl: {
    dev_name: "Afvalkalender", gft: "GFT", pmd: "PMD", papier: "Papier", restafval: "Restafval", textiel: "Textiel", kca: "KCA",
    snoeiafval: "Snoeiafval", glas: "Glas", kerstbomen: "Kerstbomen", milieustraat: "Milieustraat",
    today: "Vandaag", tomorrow: "Morgen", in_days: "Over {n} dagen", days: "{n} dagen", and: "en",
    s_today: "Vandaag: {w}", s_tomorrow: "Morgen: {w}", s_later: "Over {n} dagen: {w}", s_none: "Geen ophaaldagen gepland", s_unavailable: "Niet beschikbaar",
    put_out: "vanavond buitenzetten", collection: "Ophaaldag", countdown: "Nog te gaan", pickup: "Ophalen", no_date: "Geen datum",
    notif: "{n} melding", notifs: "{n} meldingen",
  },
};
const WS_BAD = ["unavailable", "unknown", "none", ""];
const wsEsc = (v) => String(v ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
const wsLang = (hass) => String(hass?.locale?.language || hass?.language || "en").slice(0, 2);
const wsColor = (v, fb) => (typeof v === "string" && /^#[0-9a-f]{3,8}$/i.test(v) ? v : WS_COLORS[v] || WS_COLORS[fb] || WS_COLORS.gray);
const wsKey = (id) => String(id || "").split(".").pop().replace(/^afvalwijzer_?/, "");
const wsType = (id) => WS_TYPES.find(([re]) => re.test(wsKey(id)));
// local midnight of the collection day, or null ("geen", unknown, …)
const wsDate = (state) => {
  const s = String(state ?? "").trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  m = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(s); // "20-11-2026" (formatted template sensors)
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  if (!/\d{4}-\d{2}-\d{2}T/.test(s)) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
};
const wsToday = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };

// a wheelie bin, front view; n = 1 | 2 picks the colour variables --b1/--l1 or --b2/--l2
const WS_BIN = (n) => `
<g class="bin b${n}"><g class="rock">
  <ellipse cx="60" cy="121" rx="31" ry="2.6" fill="#000" opacity=".22"/>
  <circle cx="38" cy="117" r="4.6" fill="#22272d"/><circle cx="38" cy="117" r="1.6" fill="#6b747d"/>
  <circle cx="82" cy="117" r="4.6" fill="#22272d"/><circle cx="82" cy="117" r="1.6" fill="#6b747d"/>
  <rect x="33" y="38" width="54" height="5" rx="2.5" style="fill:color-mix(in srgb, var(--l${n}) 55%, #1d2228)"/>
  <path d="M30 50H90L86 112.5Q85.8 116 82.5 116H37.5Q34.2 116 34 112.5Z" style="fill:var(--b${n})"/>
  <path d="M30 50H90L86 112.5Q85.8 116 82.5 116H37.5Q34.2 116 34 112.5Z" fill="url(#ID-shine)"/>
  <path d="M41 58l1.6 50M79 58l-1.6 50" stroke="#000" stroke-opacity=".16" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M30 50H90l-.4 5H30.4z" fill="#000" opacity=".14"/>
  <rect x="47" y="70" width="26" height="15" rx="3" fill="#fff" opacity=".93"/>
  <text class="sticker" x="60" y="77.8" text-anchor="middle"></text>
  <rect class="inside" x="29" y="44.5" width="62" height="6" rx="2" fill="#15191d"/>
  <g class="lid">
    <rect x="26" y="42" width="68" height="9" rx="3" style="fill:var(--l${n})"/>
    <rect x="26" y="42" width="68" height="9" rx="3" fill="url(#ID-shine)" opacity=".7"/>
    <rect x="27.5" y="49" width="65" height="3" rx="1.5" style="fill:color-mix(in srgb, var(--l${n}) 70%, #000)"/>
    <path d="M30 44.4h60" stroke="#fff" stroke-opacity=".45" stroke-width="1" stroke-linecap="round"/>
  </g>
</g></g>`;

const WS_SVG = `
<defs>
<linearGradient id="ID-shine" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".05"/><stop offset=".22" stop-color="#fff" stop-opacity=".32"/><stop offset=".5" stop-color="#fff" stop-opacity=".06"/><stop offset=".85" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
<linearGradient id="ID-road" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5d646c"/><stop offset="1" stop-color="#454b52"/></linearGradient>
</defs>
<g fill="rgba(127,127,127,.11)">${Array.from({ length: 12 }, (_, i) => `<path d="M${i * 10 + 1} 112V62l4-3.5 4 3.5V112z"/>`).join("")}
  <rect x="0" y="72" width="120" height="3" rx="1"/><rect x="0" y="99" width="120" height="3" rx="1"/></g>
<rect x="0" y="112" width="120" height="13" fill="rgba(127,127,127,.22)"/>
<path d="M0 118.5h120" stroke="rgba(127,127,127,.25)" stroke-width=".5"/>
<path d="M30 112v13M60 112v13M90 112v13" stroke="rgba(127,127,127,.22)" stroke-width=".5"/>
<rect x="0" y="125" width="120" height="2.4" fill="#9aa3ad"/>
<rect x="0" y="127.4" width="120" height="12.6" fill="url(#ID-road)"/>
<path class="lane" d="M-12 134h8M8 134h8M28 134h8M48 134h8M68 134h8M88 134h8M108 134h8M128 134h8" stroke="#e8eaec" stroke-width=".9" stroke-opacity=".6"/>
<g class="arrows" fill="none" style="stroke:var(--c)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M96 113l4 4-4 4"/><path d="M103 113l4 4-4 4"/></g>
${WS_BIN(2)}${WS_BIN(1)}
<g class="more"><circle cx="104" cy="40" r="7.5" style="fill:var(--c)"/><text class="more-t" x="104" y="40.4" text-anchor="middle"></text></g>
<g class="truck">
  <rect x="2" y="123.5" width="19" height="10" rx="1.5" fill="#43a047"/>
  <path d="M5 125.5v6M9 125.5v6M13 125.5v6M17 125.5v6" stroke="#2e7d32" stroke-width=".8"/>
  <path d="M21 126h5.5l3 3.6v3.9H21z" fill="#e9edf0"/><path d="M22.5 127h3.4l2 2.6h-5.4z" fill="#7fb7e0"/>
  <circle cx="7" cy="134.2" r="2.3" fill="#1d2228"/><circle cx="25.5" cy="134.2" r="2.3" fill="#1d2228"/>
  <rect x="28" y="125" width="1.6" height="1.4" rx=".4" fill="#ffb300"/>
</g>
<g class="sparkle" fill="#ffd54f"><path d="M24 30l1.3 3.2 3.2 1.3-3.2 1.3L24 39l-1.3-3.2-3.2-1.3 3.2-1.3z"/><path d="M95 22l1 2.4 2.4 1-2.4 1L95 29l-1-2.6-2.4-1 2.4-1z"/></g>`;

const WSTYLE = `
:host {
  --ws-off: var(--disabled-text-color, #9aa3ad);
  --ws-alert: var(--error-color, #db4437);
  display: block; height: 100%;
}
:host([paused]) *, :host([paused]) *::before, :host([paused]) *::after { animation-play-state: paused !important; }
ha-card { height: 100%; overflow: hidden; container-type: inline-size; position: relative; }
ha-card::before {
  content: ""; position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 1s, background 1s;
  background: radial-gradient(120% 90% at 0% 0%, color-mix(in srgb, var(--c) 18%, transparent), transparent 60%);
}
ha-card.on::before { opacity: 1; }
.wrap { --c: var(--ws-off); padding: 14px; display: flex; flex-direction: column; gap: 12px; position: relative; }
.top { display: grid; grid-template-columns: auto minmax(0,1fr); column-gap: 14px; row-gap: 10px; align-items: start; }
.illus {
  width: var(--aircon-illustration-size, 116px); aspect-ratio: 120/140; border-radius: 16px; padding: 4px; box-sizing: content-box; cursor: pointer;
  grid-row: span 2;
  background: radial-gradient(circle at 50% 40%, rgba(127,127,127,.10), rgba(127,127,127,.03) 70%);
  transition: box-shadow .8s;
}
.on .illus { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 25%, transparent); }
svg { width: 100%; height: 100%; display: block; overflow: visible; }
/* the scene (pavement, road, truck) fills the rounded tile edge to edge, as in awning-card */
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
.dot { width: 8px; height: 8px; border-radius: 50%; flex: none; background: var(--c); transition: background .4s; position: relative; }
.on .dot { box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 25%, transparent); }
.run .dot::after { content: ""; position: absolute; inset: 0; border-radius: 50%; background: var(--c); animation: pulse 2s ease-out infinite; }
.sub { font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sub:empty { display: none; }
.alert { display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; color: var(--ws-alert); min-width: 0; }
.alert span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.alert ha-icon { --mdc-icon-size: 15px; flex: none; }
.alert[hidden] { display: none; }
.stats { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 6px; }
.stats:empty { display: none; }
.tile { display: flex; flex-direction: column; padding: 6px 9px; border-radius: 10px; min-width: 0; background: rgba(127,127,127,.09); cursor: pointer; }
.tile:hover { background: rgba(127,127,127,.16); }
.val { font-size: 14px; font-weight: 600; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-variant-numeric: tabular-nums; }
.lbl { display: flex; align-items: center; gap: 3px; font-size: 11px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lbl ha-icon { --mdc-icon-size: 13px; flex: none; }

.modes { display: grid; grid-template-columns: repeat(var(--n, 4), minmax(0,1fr)); gap: 8px; }
.mode {
  --mc: var(--ws-off); --mt: #fff;
  position: relative; overflow: hidden; border: none; border-radius: 12px; padding: 9px 4px 8px; cursor: pointer; font: inherit;
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  color: var(--secondary-text-color); background: rgba(127,127,127,.10);
  transition: background .3s, color .3s, transform .15s, box-shadow .3s;
}
.mode.light { --mt: #1d2228; }
.mode .ml { font-size: 12px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.mode:hover { background: rgba(127,127,127,.17); }
.mode:active { transform: scale(.96); }
.mode:focus-visible { outline: 2px solid var(--mc); outline-offset: 2px; }
.mode.active { color: var(--mt); background: var(--mc); box-shadow: 0 4px 14px -4px color-mix(in srgb, var(--mc) 70%, transparent); }
.mode .ripple { position: absolute; border-radius: 50%; transform: scale(0); background: color-mix(in srgb, var(--mc) 45%, transparent); animation: ripple .6s ease-out forwards; pointer-events: none; }
/* waste-card: a mini bin instead of an icon, and when it's collected under the name */
.mode .mb { width: 22px; height: 22px; display: block; overflow: visible; transition: transform .4s; }
.mode .mb .mbb { fill: var(--b); } .mode .mb .mbl { fill: var(--l); }
.mode .mb .mbh { fill: color-mix(in srgb, var(--l) 55%, #1d2228); }
.mode.active .mb { filter: drop-shadow(0 0 1px rgba(255,255,255,.9)); }
.mode .mw { font-size: 11px; opacity: .8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; font-variant-numeric: tabular-nums; }
.mode.soon { box-shadow: inset 0 0 0 1.5px var(--mc); }
.mode.soon .mw { color: var(--primary-text-color); opacity: 1; font-weight: 600; }
.mode.none { opacity: .55; }
.mode.active .mb { animation: hop 1s ease-in-out infinite; }

.wrap.s-today { --c: var(--pc, #43a047); }
.wrap.s-tomorrow { --c: var(--pc, #ffb300); }
.wrap.s-later { --c: var(--pc, #7b858f); }

/* ---- illustration ---- */
.bin, .rock, .lid, .truck, .arrows path, .more, .sparkle path { transform-box: view-box; }
.bin { transform-origin: 60px 120px; transform: scale(1.14); transition: transform .6s cubic-bezier(.3,1.3,.5,1), opacity .4s; }
.b2 { opacity: 0; }
.two .b1 { transform: translate(-23px, 0) scale(.78); }
.two .b2 { opacity: 1; transform: translate(23px, 0) scale(.78); }
.rock { transform-origin: 60px 121px; }
.lid { transform-origin: 92px 46px; transition: transform .5s; }
.inside { opacity: 0; transition: opacity .3s; }
.sticker { font: 700 8.5px ui-sans-serif, system-ui, sans-serif; dominant-baseline: central; fill: #37414b; text-transform: uppercase; }
.more { opacity: 0; transition: opacity .4s; }
.more-on .more { opacity: 1; }
.more-t { font: 700 8px ui-sans-serif, system-ui, sans-serif; dominant-baseline: central; fill: #fff; }
.truck { opacity: 0; transform: translateX(-36px); }
.arrows path { opacity: 0; }
.sparkle path { opacity: 0; transform-origin: center; transform-box: fill-box; }
.lane { opacity: .7; }
.s-none .bin, .s-unavailable .bin { opacity: .45; }
.s-none .b2, .s-unavailable .b2 { opacity: 0; }
/* today: the lid flips open, the garbage truck drives past */
.s-today .lid { animation: lid 2s ease-in-out infinite; }
.s-today .inside { animation: inside 2s ease-in-out infinite; }
.s-today .b2 .lid, .s-today .b2 .inside { animation-delay: -.5s; }
.s-today .truck { animation: truck 4s linear infinite; }
.s-today .sparkle path { animation: twinkle 2s ease-in-out infinite; }
.s-today .sparkle path:nth-child(2) { animation-delay: -1s; }
/* tomorrow: the bin is being rolled to the kerb */
.s-tomorrow .rock { animation: rock 1s ease-in-out infinite; }
.s-tomorrow .b2 .rock { animation-delay: -.5s; }
.s-tomorrow .arrows path { animation: chev 1s ease-in-out infinite; }
.s-tomorrow .arrows path:nth-child(2) { animation-delay: -.5s; }

@keyframes lid { 0%,15%,85%,100% { transform: none; } 40%,60% { transform: translateY(-6px) rotate(-14deg); } }
@keyframes inside { 0%,18%,82%,100% { opacity: 0; } 40%,60% { opacity: 1; } }
@keyframes truck { from { transform: translateX(-36px); opacity: 1; } to { transform: translateX(124px); opacity: 1; } }
@keyframes twinkle { 0%,100% { opacity: 0; transform: scale(.4); } 50% { opacity: 1; transform: scale(1); } }
@keyframes rock { 0%,100% { transform: rotate(-2.5deg); } 50% { transform: rotate(2.5deg) translateX(1.5px); } }
@keyframes chev { 0%,100% { opacity: .15; transform: translateX(-2px); } 50% { opacity: 1; transform: translateX(2px); } }
@keyframes hop { 0%,100% { transform: none; } 50% { transform: translateY(-2px); } }
@keyframes pulse { 0% { transform: scale(1); opacity: .55; } 100% { transform: scale(2.8); opacity: 0; } }
@keyframes ripple { to { transform: scale(2.6); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; } }
@container (max-width: 460px) { .modes .ml { font-size: 11px; } }
@container (max-width: 340px) {
  .illus { width: var(--aircon-illustration-size-small, 84px); grid-row: auto; }
  .stats { grid-column: 1 / -1; }
  .mode .ml { font-size: 11px; }
}
`;
// mini bin for the buttons (and the editor), 24×24
const WS_MINI = `<svg class="mb" viewBox="0 0 24 24" aria-hidden="true"><rect class="mbh" x="5" y="2.6" width="14" height="1.8" rx=".9"/>
<path class="mbb" d="M4.6 7.2h14.8l-1.1 13.2q-.1 1.1-1.2 1.1H6.9q-1.1 0-1.2-1.1z"/><path d="M4.6 7.2h14.8l-.1 1.4H4.7z" fill="#000" opacity=".18"/>
<rect class="mbl" x="3.4" y="4.2" width="17.2" height="3.4" rx="1.1"/><circle cx="7.2" cy="21.6" r="1.5" fill="#22272d"/><circle cx="16.8" cy="21.6" r="1.5" fill="#22272d"/></svg>`;
const wsIsLight = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ""));
  if (!m) return false;
  const v = parseInt(m[1], 16);
  return 0.299 * ((v >> 16) & 255) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255) > 170;
};

class WasteCard extends HTMLElement {
  static async getConfigElement() {
    if (!customElements.get("ha-form") || !customElements.get("ha-entity-picker")) {
      try {
        const helpers = await window.loadCardHelpers?.();
        const tile = await helpers?.createCardElement({ type: "tile", entity: "sun.sun" });
        await tile?.constructor?.getConfigElement?.();
      } catch (e) { /* ignore */ }
    }
    return document.createElement("waste-card-editor");
  }

  static getStubConfig(hass) {
    const ids = Object.keys(hass?.states || {}).filter((e) => /^sensor\.afvalwijzer/.test(e));
    const skip = /today|tomorrow|day_after|next|notification|formatted|milieustraat|vandaag|morgen/;
    const bins = ids.filter((e) => !skip.test(e) && (wsType(e) || hass.states[e]?.attributes?.days_until_collection_date !== undefined))
      .map((entity) => ({ entity }));
    const cfg = { name: (WTXT[wsLang(hass)] || WTXT.en).dev_name, bins };
    const n = ids.find((e) => /notification/.test(e));
    if (n) cfg.notifications = n;
    return cfg;
  }

  setConfig(config) {
    if (!config) throw new Error("Invalid configuration");
    if (config.bins != null && !Array.isArray(config.bins)) throw new Error("bins must be a list");
    this._config = { ...config };
    this._built = false;
    this._ids = null;
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
    if (old.locale?.language !== hass.locale?.language) { this._built = false; return true; }
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
    return this._ids.some((id) => old.states[id] !== hass.states[id]);
  }
  _observe() {
    if (this._io || typeof IntersectionObserver === "undefined") return;
    this._io = new IntersectionObserver((entries) => this.toggleAttribute("paused", !entries[entries.length - 1].isIntersecting));
    this._io.observe(this);
  }
  connectedCallback() { this._observe(); if (this._built) this._render(); }
  disconnectedCallback() { this._io?.disconnect(); this._io = null; clearTimeout(this._midnight); }
  getCardSize() { return 4; }
  getGridOptions() { return { columns: 12, min_columns: 6, rows: "auto" }; }

  _t(k, n) { const L = WTXT[wsLang(this._hass)] || WTXT.en; return String(L[k] ?? WTXT.en[k] ?? k).replace("{n}", n); }
  _st(id) { return typeof id === "string" ? this._hass.states[id] : undefined; }
  _ok(s) { return !!s && !WS_BAD.includes(String(s.state).toLowerCase()); }
  _locale() { return this._hass?.locale?.language || undefined; }

  // configured containers with their next date, soonest first
  _items() {
    const today = wsToday();
    return (this._config.bins || []).map((b, i) => {
      const cfg = typeof b === "string" ? { entity: b } : b || {};
      const s = this._st(cfg.entity), ty = wsType(cfg.entity);
      const date = s ? wsDate(s.state) : null;
      const days = date ? Math.round((date - today) / 86400000) : null;
      const name = cfg.name || (ty ? this._t(ty[1]) : wsKey(cfg.entity).replace(/_/g, " ").replace(/^./, (x) => x.toUpperCase()) || `#${i + 1}`);
      const body = wsColor(cfg.color, ty?.[2]), lid = wsColor(cfg.lid, ty?.[3]);
      const accent = lid.toLowerCase() !== WS_COLORS.gray ? lid : body;
      return { i, cfg, s, date, days: days != null && days >= 0 ? days : null, name, body, lid, accent };
    }).sort((a, b) => (a.days ?? 1e9) - (b.days ?? 1e9) || a.i - b.i);
  }
  _when(it, long) {
    if (it.days == null) return this._t("no_date");
    if (it.days === 0) return this._t("today");
    if (it.days === 1) return this._t("tomorrow");
    if (it.days < 7 || long) return it.date.toLocaleDateString(this._locale(), { weekday: "short", day: "numeric", month: "short" });
    return it.date.toLocaleDateString(this._locale(), { day: "numeric", month: "short" });
  }
  _join(names) {
    if (names.length < 2) return names.join("");
    return `${names.slice(0, -1).join(", ")} ${this._t("and")} ${names[names.length - 1]}`;
  }

  _build() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    const uid = `ws${Math.random().toString(36).slice(2, 8)}`;
    const items = this._items();
    const shown = items.length;
    const cols = this._config.columns || Math.min(Math.max(shown, 1), 4);
    this.shadowRoot.innerHTML = `
      <style>${WSTYLE}</style>
      <ha-card>
        <div class="wrap" id="wrap">
          <div class="top">
            <div class="illus" id="illus"><svg viewBox="0 0 120 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${WS_SVG.replace(/ID-/g, `${uid}-`)}</svg></div>
            <div class="head" id="head">
              <div class="name" id="name"></div>
              <div class="status"><span class="dot"></span><span class="txt" id="status"></span></div>
              <div class="sub" id="sub"></div>
              <div class="alert" id="alert" hidden><ha-icon icon="mdi:alert-circle"></ha-icon><span id="alert-t"></span></div>
            </div>
            <div class="stats" id="stats"></div>
          </div>
          <div class="modes" id="modes" style="--n:${cols}"></div>
        </div>
      </ha-card>`;
    const $ = (id) => this.shadowRoot.getElementById(id);
    this._el = { wrap: $("wrap"), card: this.shadowRoot.querySelector("ha-card"), name: $("name"), status: $("status"), sub: $("sub"),
      alert: $("alert"), alertT: $("alert-t"), stats: $("stats"), modes: $("modes"),
      stickers: [...this.shadowRoot.querySelectorAll(".sticker")], more: this.shadowRoot.querySelector(".more-t") };
    if (this._config.hide_bins) $("modes").style.display = "none";
    $("modes").addEventListener("click", (ev) => {
      const el = ev.target.closest(".mode");
      if (!el) return;
      this._ripple(el, ev);
      this._moreInfo(el.dataset.entity);
    });
    const first = () => this._next?.[0]?.cfg.entity || this._items()[0]?.cfg.entity;
    $("illus").addEventListener("click", () => (this._config.tap_action ? this._runAction(this._config.tap_action) : this._moreInfo(first())));
    $("head").addEventListener("click", (ev) => this._moreInfo(ev.target.closest("#alert") ? this._config.notifications : first()));
    $("stats").addEventListener("click", () => this._moreInfo(first()));
    this._modesHtml = this._tilesHtml = null;
    this._built = true;
  }

  _render() {
    if (!this._built) this._build();
    const c = this._config, E = this._el;
    const items = this._items();
    const max = Number(c.max_days) || 0;
    const visible = items.filter((it) => (it.days != null || c.show_empty) && (!max || it.days == null || it.days <= max));
    const dated = items.filter((it) => it.days != null);
    const next = this._next = dated.length ? dated.filter((it) => it.days === dated[0].days) : [];
    const anyOk = items.some((it) => this._ok(it.s) || String(it.s?.state).toLowerCase() === "geen");
    const status = !items.length || !anyOk ? (items.length ? "unavailable" : "none") : !next.length ? "none" : next[0].days === 0 ? "today" : next[0].days === 1 ? "tomorrow" : "later";
    const live = status === "today" || status === "tomorrow";

    E.wrap.className = `wrap s-${status} ${live ? "on run" : ""} ${next.length > 1 ? "two" : ""} ${next.length > 2 ? "more-on" : ""}`;
    E.card.classList.toggle("on", live);
    const b1 = next[0] || items[0], b2 = next[1] || b1;
    if (b1) {
      E.wrap.style.setProperty("--b1", b1.body); E.wrap.style.setProperty("--l1", b1.lid);
      E.wrap.style.setProperty("--b2", b2.body); E.wrap.style.setProperty("--l2", b2.lid);
      E.wrap.style.setProperty("--pc", b1.accent);
    } else ["--b1", "--l1", "--b2", "--l2"].forEach((p) => E.wrap.style.setProperty(p, WS_COLORS.gray));
    if (status === "none" || status === "unavailable") E.wrap.style.removeProperty("--pc");
    const wd = (it) => (it?.date ? it.date.toLocaleDateString(this._locale(), { weekday: "short" }).replace(".", "") : "–");
    E.stickers[0].textContent = wd(next[1] || b2); // .b2 comes first in the drawing
    E.stickers[1].textContent = wd(next[0] || b1);
    E.more.textContent = `+${next.length - 2}`;

    E.name.textContent = c.name || this._t("dev_name");
    const w = this._join(next.map((it) => it.name));
    E.status.textContent = status === "today" ? this._t("s_today").replace("{w}", w)
      : status === "tomorrow" ? this._t("s_tomorrow").replace("{w}", w)
      : status === "later" ? this._t("s_later", next[0].days).replace("{w}", w)
      : this._t(`s_${status}`);
    // the date itself is in the tiles; without tiles it goes under the status line
    E.sub.textContent = status === "tomorrow" ? this._t("put_out") : next.length && c.show_tiles === false && status === "later" ? this._when(next[0], true) : "";

    // collector messages (Afvalwijzer notifications sensor: state = count, attribute notifications = [{title, content}])
    const ns = this._st(c.notifications), cnt = Number(ns?.state) || 0;
    E.alert.hidden = !cnt;
    if (cnt) {
      const list = ns.attributes?.notifications || [];
      const title = list.length ? String(list[list.length - 1]?.title || "") : "";
      E.alertT.textContent = title || this._t(cnt === 1 ? "notif" : "notifs", cnt);
    }

    const tiles = next.length && c.show_tiles !== false ? [
      { icon: "mdi:calendar-clock", lbl: this._t("collection"), v: next[0].date.toLocaleDateString(this._locale(), { weekday: "short", day: "numeric", month: "short" }) },
      next[0].days <= 1
        ? { icon: "mdi:timer-outline", lbl: this._t("pickup"), v: this._t(next[0].days === 0 ? "today" : "tomorrow") }
        : { icon: "mdi:timer-outline", lbl: this._t("countdown"), v: this._t("days", next[0].days) },
    ] : [];
    const th = tiles.map((t) => `<div class="tile"><span class="val">${wsEsc(t.v)}</span><span class="lbl"><ha-icon icon="${t.icon}"></ha-icon>${wsEsc(t.lbl)}</span></div>`).join("");
    if (th !== this._tilesHtml) { E.stats.innerHTML = th; this._tilesHtml = th; }

    const mh = visible.map((it) => {
      const cls = it.days === 0 ? "active" : it.days === 1 ? "soon" : it.days == null ? "none" : "";
      return `<button class="mode ${cls} ${wsIsLight(it.accent) ? "light" : ""}" data-entity="${wsEsc(it.cfg.entity || "")}" style="--mc:${wsEsc(it.accent)};--b:${wsEsc(it.body)};--l:${wsEsc(it.lid)}" title="${wsEsc(`${it.name} · ${this._when(it, true)}`)}">
        ${WS_MINI}<span class="ml">${wsEsc(it.name)}</span><span class="mw">${wsEsc(this._when(it))}</span></button>`;
    }).join("");
    if (mh !== this._modesHtml) { E.modes.innerHTML = mh; this._modesHtml = mh; }
    E.modes.hidden = !visible.length;

    // the day changes at midnight without any state change: redraw then
    clearTimeout(this._midnight);
    const t = wsToday(); t.setDate(t.getDate() + 1);
    this._midnight = setTimeout(() => this._render(), Math.min(t - Date.now() + 2000, 6 * 3600 * 1000));
  }

  _ripple(el, ev) {
    const r = el.getBoundingClientRect(), d = Math.max(r.width, r.height);
    const s = document.createElement("span");
    s.className = "ripple";
    s.style.cssText = `width:${d}px;height:${d}px;left:${(ev.clientX || r.left + r.width / 2) - r.left - d / 2}px;top:${(ev.clientY || r.top + r.height / 2) - r.top - d / 2}px`;
    el.appendChild(s);
    setTimeout(() => s.remove(), 650);
  }

  async _runAction(a) {
    const type = a.action;
    if (type === "more-info") return this._moreInfo(a.entity || this._next?.[0]?.cfg.entity);
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
const WED_TXT = {
  en: {
    name: "Name", notifications: "Collector messages (optional)", max_days: "Only show containers within (days, empty = all)", columns: "Containers per row",
    show_empty: "Show containers without a date", show_tiles: "Show date tiles", hide_bins: "Hide containers",
    entity: "Sensor (collection date)", bin_name: "Name (empty = automatic)", color: "Container colour", lid: "Lid colour",
    sec_main: "Waste collection", sec_bins: "Containers", sec_layout: "Layout",
    bins_hint: "One row per waste type. Pick the Afvalwijzer sensor and the colours of your own container and lid.",
    add: "Add container", remove: "Remove", up: "Move up", down: "Move down",
    gray: "Grey", green: "Green", brown: "Brown", blue: "Blue", orange: "Orange",
  },
  nl: {
    name: "Naam", notifications: "Meldingen van de inzamelaar (optioneel)", max_days: "Alleen containers tonen binnen (dagen, leeg = alles)", columns: "Containers per rij",
    show_empty: "Containers zonder datum tonen", show_tiles: "Datum-tegels tonen", hide_bins: "Containers verbergen",
    entity: "Sensor (ophaaldatum)", bin_name: "Naam (leeg = automatisch)", color: "Kleur container", lid: "Kleur deksel",
    sec_main: "Afvalkalender", sec_bins: "Containers", sec_layout: "Weergave",
    bins_hint: "Eén regel per afvalsoort. Kies de Afvalwijzer-sensor en de kleuren van je eigen container en deksel.",
    add: "Container toevoegen", remove: "Verwijderen", up: "Omhoog", down: "Omlaag",
    gray: "Grijs", green: "Groen", brown: "Bruin", blue: "Blauw", orange: "Oranje",
  },
};
const WED_STYLE = `
.section { margin-top: 20px; }
.section h3 { margin: 0 0 8px; font-size: 15px; font-weight: 500; color: var(--primary-text-color); }
.hint { font-size: 12px; color: var(--secondary-text-color); margin: 0 0 10px; }
.btn-row { border: 1px solid var(--divider-color, rgba(127,127,127,.3)); border-radius: 12px; padding: 8px 10px 10px; margin-bottom: 10px; }
.btn-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.btn-head .mb { width: 26px; height: 26px; flex: none; }
.btn-head .mb .mbb { fill: var(--b); } .btn-head .mb .mbl { fill: var(--l); } .btn-head .mb .mbh { fill: color-mix(in srgb, var(--l) 55%, #1d2228); }
.btn-head .t { flex: 1; font-weight: 500; font-size: 14px; color: var(--primary-text-color); }
.btn-head button, .add { border: none; background: none; cursor: pointer; color: var(--secondary-text-color); border-radius: 50%; width: 32px; height: 32px; display: grid; place-items: center; }
.btn-head button:hover { background: rgba(127,127,127,.15); color: var(--primary-text-color); }
.btn-head button[disabled] { opacity: .3; pointer-events: none; }
.add { width: auto; height: auto; border-radius: 10px; padding: 8px 14px; display: inline-flex; gap: 6px; align-items: center; font: inherit; font-size: 14px; color: var(--primary-color); border: 1px dashed var(--primary-color); }
.add:hover { background: color-mix(in srgb, var(--primary-color) 10%, transparent); }
`;

class WasteCardEditor extends HTMLElement {
  setConfig(config) { this._config = { ...config }; this._render(); }
  set hass(hass) {
    this._hass = hass;
    this.shadowRoot?.querySelectorAll("ha-form").forEach((f) => (f.hass = hass));
    if (!this._built) this._render();
  }
  _t(k) { return (WED_TXT[wsLang(this._hass)] || WED_TXT.en)[k] ?? WED_TXT.en[k] ?? k; }
  _ct(k) { return (WTXT[wsLang(this._hass)] || WTXT.en)[k] ?? k; }
  _bins() { return Array.isArray(this._config.bins) ? this._config.bins.map((b) => (typeof b === "string" ? { entity: b } : { ...b })) : []; }
  _schemas() {
    const colors = { select: { mode: "dropdown", options: Object.keys(WS_COLORS).map((k) => ({ value: k, label: this._t(k) })) } };
    return {
      main: [
        { name: "name", selector: { text: {} } },
        { name: "notifications", selector: { entity: { domain: "sensor" } } },
      ],
      bin: [
        { name: "entity", selector: { entity: { domain: "sensor" } } },
        { name: "name", selector: { text: {} } },
        { type: "grid", name: "", schema: [{ name: "color", selector: colors }, { name: "lid", selector: colors }] },
      ],
      layout: [
        { name: "max_days", selector: { number: { min: 1, max: 365, step: 1, mode: "box", unit_of_measurement: "d" } } },
        { name: "columns", selector: { number: { min: 1, max: 6, step: 1, mode: "slider" } } },
        { type: "grid", name: "", schema: [{ name: "show_tiles", selector: { boolean: {} } }, { name: "show_empty", selector: { boolean: {} } }] },
        { name: "hide_bins", selector: { boolean: {} } },
      ],
    };
  }
  _render() {
    if (!this._config) return;
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    const bins = this._bins();
    if (this._built && bins.length === this._n) { this._update(bins); return; }
    this._built = true;
    this._n = bins.length;
    const sch = this._schemas();
    this.shadowRoot.innerHTML = `<style>${WED_STYLE}</style>
      <div class="section" style="margin-top:0"><h3>${this._t("sec_main")}</h3><div id="f-main"></div></div>
      <div class="section"><h3>${this._t("sec_bins")}</h3><p class="hint">${this._t("bins_hint")}</p>
        <div id="bins">${bins.map((b, i) => `
          <div class="btn-row" data-i="${i}">
            <div class="btn-head">${WS_MINI}<span class="t"></span>
              <button data-act="up" title="${this._t("up")}" ${i === 0 ? "disabled" : ""}><ha-icon icon="mdi:arrow-up"></ha-icon></button>
              <button data-act="down" title="${this._t("down")}" ${i === bins.length - 1 ? "disabled" : ""}><ha-icon icon="mdi:arrow-down"></ha-icon></button>
              <button data-act="remove" title="${this._t("remove")}"><ha-icon icon="mdi:delete-outline"></ha-icon></button>
            </div>
            <div class="f-bin"></div>
          </div>`).join("")}</div>
        <button class="add" id="add"><ha-icon icon="mdi:plus"></ha-icon>${this._t("add")}</button>
      </div>
      <div class="section"><h3>${this._t("sec_layout")}</h3><div id="f-layout"></div></div>`;
    const mk = (host, schema, onChange, labels = {}) => {
      const f = document.createElement("ha-form");
      f.hass = this._hass; f.schema = schema; f.data = {};
      f.computeLabel = (s) => this._t(labels[s.name] || s.name);
      f.addEventListener("value-changed", (ev) => { ev.stopPropagation(); onChange(ev.detail.value); });
      host.appendChild(f);
      return f;
    };
    const $ = (id) => this.shadowRoot.getElementById(id);
    this._forms = {
      main: mk($("f-main"), sch.main, (v) => this._patch(v, ["name", "notifications"])),
      layout: mk($("f-layout"), sch.layout, (v) => this._patch(v, ["max_days", "columns", "show_tiles", "show_empty", "hide_bins"])),
      bins: [...this.shadowRoot.querySelectorAll(".btn-row")].map((row) => mk(row.querySelector(".f-bin"), sch.bin, (v) => this._patchBin(Number(row.dataset.i), v), { name: "bin_name" })),
    };
    $("add").addEventListener("click", () => {
      const used = this._bins().map((b) => b.entity);
      const free = Object.keys(this._hass?.states || {}).find((e) => /^sensor\.afvalwijzer/.test(e) && wsType(e) && !/today|tomorrow|next|notification|formatted/.test(e) && !used.includes(e));
      this._setBins([...this._bins(), free ? { entity: free } : {}]);
    });
    $("bins").addEventListener("click", (ev) => {
      const b = ev.target.closest("button[data-act]");
      if (!b) return;
      const i = Number(b.closest(".btn-row").dataset.i), list = this._bins();
      if (b.dataset.act === "remove") list.splice(i, 1);
      if (b.dataset.act === "up" && i > 0) [list[i - 1], list[i]] = [list[i], list[i - 1]];
      if (b.dataset.act === "down" && i < list.length - 1) [list[i + 1], list[i]] = [list[i], list[i + 1]];
      this._setBins(list);
    });
    this._update(bins);
  }
  _update(bins) {
    const c = this._config;
    this._forms.main.data = { name: c.name, notifications: c.notifications };
    this._forms.layout.data = { max_days: c.max_days, columns: c.columns, show_tiles: c.show_tiles !== false, show_empty: !!c.show_empty, hide_bins: !!c.hide_bins };
    const rows = this.shadowRoot.querySelectorAll(".btn-row");
    bins.forEach((b, i) => {
      const ty = wsType(b.entity), row = rows[i];
      this._forms.bins[i].data = { entity: b.entity, name: b.name, color: b.color || ty?.[2] || "gray", lid: b.lid || ty?.[3] || "gray" };
      const mb = row.querySelector(".mb");
      mb.style.setProperty("--b", wsColor(b.color, ty?.[2]));
      mb.style.setProperty("--l", wsColor(b.lid, ty?.[3]));
      row.querySelector(".t").textContent = b.name || (ty ? this._ct(ty[1]) : b.entity || `#${i + 1}`);
    });
  }
  _patchBin(i, v) {
    const list = this._bins(), b = { ...list[i] }, ty = wsType(v.entity ?? b.entity);
    ["entity", "name", "color", "lid"].forEach((k) => {
      let val = v[k];
      if (k === "color" && val === (ty?.[2] || "gray")) val = undefined; // default for this waste type → omit
      if (k === "lid" && val === (ty?.[3] || "gray")) val = undefined;
      if (val === "" || val == null) delete b[k]; else b[k] = val;
    });
    // keep `entity` first, YAML-only keys of the bin stay as they are
    const { entity, ...rest } = b;
    list[i] = entity ? { entity, ...rest } : rest;
    this._setBins(list);
  }
  _setBins(list) {
    const c = { ...this._config, bins: list };
    this._emit(c);
  }
  _patch(v, keys) {
    const c = { ...this._config };
    keys.forEach((k) => {
      let val = v[k];
      if (k === "show_tiles") val = val === false ? false : undefined;
      if (k === "show_empty" || k === "hide_bins") val = val ? true : undefined;
      if (val === "" || val == null) delete c[k]; else c[k] = val;
    });
    this._emit(c);
  }
  _emit(c) {
    const { type, ...rest } = c;
    this._config = { type, ...rest };
    this._render();
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
  }
}

customElements.define("waste-card-editor", WasteCardEditor);
customElements.define("waste-card", WasteCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "waste-card", name: "Waste collection card", description: "Animated waste-collection calendar (Afvalwijzer) with your own container and lid colours", preview: true });
console.info(`%c WASTE-CARD %c ${WS_VERSION} `, "color:#fff;background:#43a047;font-weight:700", "color:#43a047");
