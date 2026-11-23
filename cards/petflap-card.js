/*
 * petflap-card — animated pet / cat flap card for Home Assistant
 * Made for the Sure Petcare integration (SureFlap): the flap's three lock entities (locked in / locked out / locked all;
 * all unlocked = open), a presence binary_sensor per pet (on = inside, attribute `since`), battery and connectivity.
 * Same design language as the other cards.
 */
const PF_VERSION = "1.1.1";

// lock modes in button order; `lock` = which lock entity is locked in that mode
const PF_MODES = {
  unlocked: { icon: "mdi:lock-open-variant-outline", color: "#66bb6a" },
  locked_in: { icon: "mdi:home-import-outline", color: "#ffb300" },
  locked_out: { icon: "mdi:home-export-outline", color: "#42a5f5" },
  locked_all: { icon: "mdi:lock-outline", color: "#ef5350" },
};
const PF_LOCKS = ["locked_in", "locked_out", "locked_all"];
// coats: base fur, optional tabby stripes, white bib + paws (`white`), or coloured cap/ears/tail/spot on a white cat (`patch`)
const PF_WHITE = "#f7f4ee";
const PF_COAT = {
  black: { fur: "#2f3136" }, grey: { fur: "#8d949c" }, ginger: { fur: "#e0893a" }, brown: { fur: "#7a5236" }, cream: { fur: "#e6d2a8" }, white: { fur: "#f2f0ea" },
  ginger_tabby: { fur: "#e0893a", stripe: "#a9561b" },
  ginger_white: { fur: "#e0893a", stripe: "#a9561b", white: 1 },
  grey_tabby: { fur: "#9aa1a8", stripe: "#5b636b" },
  brown_tabby: { fur: "#9a7752", stripe: "#4a3523" },
  black_white: { fur: "#2f3136", white: 1 },
  grey_white: { fur: "#8d949c", white: 1 },
  white_black: { fur: "#f2f0ea", patch: "#2f3136" },
  white_grey: { fur: "#f2f0ea", patch: "#7d848c" },
};
const PF_FUR = Object.fromEntries(Object.entries(PF_COAT).map(([k, c]) => [k, c.fur]));
// where the cats sit when 1, 2 or 3 are inside: [x, y, scale] around the front cat's feet; slot 0 is in front
const PF_SLOTS = { 1: [[0, 0, 1]], 2: [[6, 0, 0.86], [-13, -3, 0.74]], 3: [[1, 0, 0.8], [-15, -4, 0.66], [16, -4, 0.66]] };
const PF_CATS = 3;
const PTXT = {
  en: {
    dev_name: "Cat flap", unlocked: "Open", locked_in: "Keep in", locked_out: "Keep out", locked_all: "Locked",
    s_unlocked: "Open both ways", s_locked_in: "In only (pets stay inside)", s_locked_out: "Out only (pets stay outside)", s_locked_all: "Locked",
    s_unknown: "Unknown", s_offline: "Offline", sending: "Sending…",
    inside: "inside", outside: "outside", is_in: "{p} is inside", is_out: "{p} is outside", n_in: "{n} of {t} inside", all_in: "All inside", all_out: "All outside",
    since: "since {t}", battery: "Battery", a_battery: "Battery low ({n} %)", a_offline: "Flap offline",
    just_now: "just now", min: "{n} min", hm: "{h} h {m} min", d: "{n} d", dh: "{d} d {h} h",
  },
  nl: {
    dev_name: "Kattenluik", unlocked: "Open", locked_in: "Binnen houden", locked_out: "Buiten houden", locked_all: "Op slot",
    s_unlocked: "Open in beide richtingen", s_locked_in: "Alleen naar binnen", s_locked_out: "Alleen naar buiten", s_locked_all: "Op slot",
    s_unknown: "Onbekend", s_offline: "Offline", sending: "Versturen…",
    inside: "binnen", outside: "buiten", is_in: "{p} is binnen", is_out: "{p} is buiten", n_in: "{n} van {t} binnen", all_in: "Allemaal binnen", all_out: "Allemaal buiten",
    since: "sinds {t}", battery: "Batterij", a_battery: "Batterij bijna leeg ({n} %)", a_offline: "Kattenluik offline",
    just_now: "zojuist", min: "{n} min", hm: "{h} u {m} min", d: "{n} d", dh: "{d} d {h} u",
  },
};
const PF_BAD = ["unavailable", "unknown", "none", ""];
const pfEsc = (v) => String(v ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
const pfLang = (hass) => String(hass?.locale?.language || hass?.language || "en").slice(0, 2);
const pfCoat = (v) => (typeof v === "string" && /^#[0-9a-f]{3,8}$/i.test(v) ? { fur: v } : PF_COAT[v] || PF_COAT.grey);
const pfFur = (v) => pfCoat(v).fur;
// small cat head in the pet's own coat (pet rows, tile, editor), drawn with the same shapes as the big cat;
// a faint outline keeps white and black heads visible on any card background
const pfHead = (v, cls = "cathead") => {
  const c = pfCoat(v), w = c.white ? PF_WHITE : "#fff", ln = 'stroke="rgba(127,127,127,.7)" stroke-width=".9" stroke-linejoin="round"';
  return `<svg class="${cls}" viewBox="14.6 68.4 24.8 26.4" aria-hidden="true">`
    + `<path d="M17.6 81.5l.6-11.5 8 7.2zM36.4 81.5l-.6-11.5-8 7.2z" fill="${c.patch || c.fur}" ${ln}/>`
    + `<path d="M19.6 77.2l.4-5 3.4 3.2zM34.4 77.2l-.4-5-3.4 3.2z" fill="#f2a7b0" opacity=".85"/>`
    + `<circle cx="27" cy="84" r="10.5" fill="${c.fur}" ${ln}/>`
    + (c.patch ? `<path d="M16.6 82.6A10.5 10.5 0 0 1 37.4 82.6Q33.5 79.6 29.4 80.8L27 83.2 24.6 80.8Q20.5 79.6 16.6 82.6z" fill="${c.patch}"/>` : "")
    + (c.stripe ? `<path d="M23.2 76.4l.9 3M27 75.4v3.4M30.8 76.4l-.9 3M16.9 84h3M17.4 87l2.7-.7M37.1 84h-3M36.6 87l-2.7-.7" fill="none" stroke="${c.stripe}" stroke-width="1.3" stroke-linecap="round"/>` : "")
    + `<ellipse cx="27" cy="89.2" rx="4.6" ry="3.2" fill="${w}" opacity="${c.white ? 1 : 0.28}"/>`
    + `<ellipse cx="23" cy="83.5" rx="1.9" ry="2.4" fill="#b5d334"/><ellipse cx="31" cy="83.5" rx="1.9" ry="2.4" fill="#b5d334"/>`
    + `<ellipse cx="23" cy="83.6" rx=".7" ry="1.9" fill="#14181b"/><ellipse cx="31" cy="83.6" rx=".7" ry="1.9" fill="#14181b"/>`
    + `<path d="M25.6 87.5h2.8l-1.4 1.5z" fill="#e88d9a"/></svg>`;
};
// CSS variables that paint one cat in the illustration
const pfCoatVars = (v) => {
  const c = pfCoat(v), w = c.white ? PF_WHITE : null;
  return `--fur:${c.fur};--ear:${c.patch || c.fur};--tailc:${c.patch || c.fur};--bib:${w || "#fff"};--bibo:${w ? 1 : 0.28};--feet:${w || c.fur};`
    + `--stripe:${c.stripe || "transparent"};--so:${c.stripe ? 0.85 : 0};--patch:${c.patch || c.fur};--po:${c.patch ? 1 : 0};--whisk:${pfIsLight(c.fur) ? "#6b625c" : "#fff"};`;
};

// small glyphs for the badge on the flap (12×12 around 0,0)
const PF_GLYPH = {
  unlocked: "M-3.2-.6h6.4v5h-6.4zM-1.8-.6v-2.2a1.8 1.8 0 0 1 3.6 0",
  locked_in: "M-4 0h6M0-3l3 3-3 3M4-4v8",
  locked_out: "M4 0h-6M-1-3l-3 3 3 3M-4.4-4v8",
  locked_all: "M-3.2-.6h6.4v5h-6.4zM-1.8-.6v-2.2a1.8 1.8 0 0 1 3.6 0v2.2",
  offline: "M-3.5-3.5l7 7M3.5-3.5l-7 7",
};

// one sitting cat; up to three are drawn (back to front: the first pet is drawn last, so it is in front)
const PF_CAT = (k) => `
<g class="cat c${k}">
  <g class="tail"><path d="M36 119c10 0 14-4 13-11s-6-8-6-3" fill="none" stroke-width="4.2" stroke-linecap="round" style="stroke:var(--tailc)"/>
    <path d="M36 119c10 0 14-4 13-11s-6-8-6-3" fill="none" stroke-width="4.3" stroke-dasharray="1.7 3" style="stroke:var(--stripe);opacity:var(--so)"/></g>
  <ellipse class="fur" cx="27" cy="106" rx="13" ry="15"/>
  <path d="M14.8 99.5q4 1.2 6.2-1M14.2 105.5q4.6 1.2 6.8-1M15 111.5q4 1.2 6.2-1M39.2 99.5q-4 1.2-6.2-1M39.8 105.5q-4.6 1.2-6.8-1M39 111.5q-4 1.2-6.2-1" fill="none" stroke-width="1.3" stroke-linecap="round" style="stroke:var(--stripe);opacity:var(--so)"/>
  <ellipse cx="33.5" cy="100" rx="5" ry="4" style="fill:var(--patch);opacity:var(--po)"/>
  <ellipse cx="27" cy="109" rx="6" ry="9.5" style="fill:var(--bib);opacity:var(--bibo)"/>
  <ellipse cx="21.5" cy="120" rx="4.4" ry="2.4" style="fill:var(--feet)"/><ellipse cx="32.5" cy="120" rx="4.4" ry="2.4" style="fill:var(--feet)"/>
  <path d="M17.6 81.5l.6-11.5 8 7.2zM36.4 81.5l-.6-11.5-8 7.2z" style="fill:var(--ear)"/>
  <path d="M19.6 77.2l.4-5 3.4 3.2zM34.4 77.2l-.4-5-3.4 3.2z" fill="#f2a7b0" opacity=".85"/>
  <circle class="fur" cx="27" cy="84" r="10.5"/>
  <path d="M16.6 82.6A10.5 10.5 0 0 1 37.4 82.6Q33.5 79.6 29.4 80.8L27 83.2 24.6 80.8Q20.5 79.6 16.6 82.6z" style="fill:var(--patch);opacity:var(--po)"/>
  <path d="M23.2 76.4l.9 3M27 75.4v3.4M30.8 76.4l-.9 3M16.9 84h3M17.4 87l2.7-.7M37.1 84h-3M36.6 87l-2.7-.7" fill="none" stroke-width="1.1" stroke-linecap="round" style="stroke:var(--stripe);opacity:var(--so)"/>
  <ellipse cx="27" cy="89.2" rx="4.6" ry="3.2" style="fill:var(--bib);opacity:var(--bibo)"/>
  <g class="eyes"><ellipse cx="23" cy="83.5" rx="1.7" ry="2.2" fill="#b5d334"/><ellipse cx="31" cy="83.5" rx="1.7" ry="2.2" fill="#b5d334"/>
    <ellipse cx="23" cy="83.6" rx=".6" ry="1.7" fill="#14181b"/><ellipse cx="31" cy="83.6" rx=".6" ry="1.7" fill="#14181b"/></g>
  <path d="M25.8 87.6h2.4l-1.2 1.3z" fill="#e88d9a"/>
  <path d="M27 88.9v1.1M27 90q-1.6 1-3 0M27 90q1.6 1 3 0" stroke="#3a3330" stroke-opacity=".55" stroke-width=".55" fill="none" stroke-linecap="round"/>
  <path d="M15 87.5l7 .8M15 90.5l7-.6M39 87.5l-7 .8M39 90.5l-7-.6" stroke-opacity=".6" stroke-width=".45" stroke-linecap="round" style="stroke:var(--whisk)"/>
</g>`;

const PF_SVG = `
<defs>
<linearGradient id="ID-door" x1="0" x2="1"><stop offset="0" stop-color="#e9e3d8"/><stop offset=".5" stop-color="#f3eee6"/><stop offset="1" stop-color="#ddd6c9"/></linearGradient>
<linearGradient id="ID-out" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe3ff"/><stop offset=".55" stop-color="#d9efff"/><stop offset=".56" stop-color="#7cb86a"/><stop offset="1" stop-color="#4f9a4a"/></linearGradient>
<linearGradient id="ID-frame" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dfe4e8"/></linearGradient>
<linearGradient id="ID-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".45" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#9fb6c6" stop-opacity=".25"/></linearGradient>
<clipPath id="ID-hole"><rect x="59" y="73" width="38" height="36" rx="6"/></clipPath>
</defs>
<rect x="0" y="0" width="120" height="124" fill="url(#ID-door)"/>
<rect x="12" y="8" width="96" height="48" rx="2" fill="none" stroke="#cfc6b6" stroke-width=".8"/>
<rect x="15" y="11" width="90" height="42" rx="1.5" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width=".6"/>
<circle cx="104" cy="64" r="2.4" fill="#b9b0a0"/>
<rect x="0" y="122" width="120" height="18" fill="rgba(127,127,127,.28)"/>
<rect x="0" y="120.5" width="120" height="2.5" fill="#cfc6b6"/>
<g class="paws" fill="rgba(90,90,90,.35)">
  <g transform="translate(20 132)"><ellipse rx="2.2" ry="1.6"/><circle cx="-2" cy="-2.2" r=".8"/><circle cx="0" cy="-2.8" r=".8"/><circle cx="2" cy="-2.2" r=".8"/></g>
  <g transform="translate(32 128)"><ellipse rx="2.2" ry="1.6"/><circle cx="-2" cy="-2.2" r=".8"/><circle cx="0" cy="-2.8" r=".8"/><circle cx="2" cy="-2.2" r=".8"/></g>
  <g transform="translate(44 133)"><ellipse rx="2.2" ry="1.6"/><circle cx="-2" cy="-2.2" r=".8"/><circle cx="0" cy="-2.8" r=".8"/><circle cx="2" cy="-2.2" r=".8"/></g>
  <g transform="translate(56 128)"><ellipse rx="2.2" ry="1.6"/><circle cx="-2" cy="-2.2" r=".8"/><circle cx="0" cy="-2.8" r=".8"/><circle cx="2" cy="-2.2" r=".8"/></g>
</g>
<rect x="53" y="67" width="50" height="48" rx="10" fill="#000" opacity=".12"/>
<rect x="54" y="68" width="48" height="46" rx="9" fill="url(#ID-frame)" stroke="#b8c0c8" stroke-width=".6"/>
<rect x="59" y="73" width="38" height="36" rx="6" fill="#2b3138"/>
<g clip-path="url(#ID-hole)">
  <rect x="59" y="73" width="38" height="36" fill="url(#ID-out)" opacity=".9"/>
  <g class="grass" fill="#3d8a3c"><path d="M62 109l2-9 1.5 9zM68 109l1.6-7 1.6 7zM75 109l2.4-10 1.2 10zM83 109l1.5-8 1.8 8zM90 109l2-9 1.4 9z"/></g>
  <g class="door"><rect x="60" y="74" width="36" height="34" rx="5" class="pane"/>
    <rect x="60" y="74" width="36" height="34" rx="5" fill="url(#ID-glass)"/>
    <path d="M63 78v20" stroke="#fff" stroke-opacity=".5" stroke-width="1.4" stroke-linecap="round"/></g>
</g>
<rect x="59" y="72" width="38" height="3" rx="1.5" fill="#cfd6dc"/>
<g class="latch"><rect x="56.4" y="86" width="2.4" height="10" rx="1"/><rect x="97.2" y="86" width="2.4" height="10" rx="1"/></g>
${[2, 1, 0].map((k) => PF_CAT(k)).join("")}
<g class="badge"><circle cx="98" cy="70" r="7.5" style="fill:var(--c)" stroke="#fff" stroke-width="1.2"/>
  ${Object.entries(PF_GLYPH).map(([k, d]) => `<path class="gl gl-${k}" transform="translate(98 70)" d="${d}" fill="none" stroke="#fff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>`).join("")}
</g>`;

const PSTYLE = `
:host {
  --pf-off: var(--disabled-text-color, #9aa3ad);
  --pf-alert: var(--error-color, #db4437);
  display: block; height: 100%;
}
:host([paused]) *, :host([paused]) *::before, :host([paused]) *::after { animation-play-state: paused !important; }
ha-card { height: 100%; overflow: hidden; container-type: inline-size; position: relative; }
ha-card::before {
  content: ""; position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 1s, background 1s;
  background: radial-gradient(120% 90% at 0% 0%, color-mix(in srgb, var(--c) 18%, transparent), transparent 60%);
}
ha-card.on::before { opacity: 1; }
.wrap { --c: var(--pf-off); padding: 14px; display: flex; flex-direction: column; gap: 12px; position: relative; }
.top { display: grid; grid-template-columns: auto minmax(0,1fr); column-gap: 14px; row-gap: 10px; align-items: start; }
.illus {
  width: var(--aircon-illustration-size, 116px); aspect-ratio: 120/140; border-radius: 16px; padding: 4px; box-sizing: content-box; cursor: pointer;
  grid-row: span 2;
  background: radial-gradient(circle at 50% 40%, rgba(127,127,127,.10), rgba(127,127,127,.03) 70%);
  transition: box-shadow .8s;
}
.on .illus { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 25%, transparent); }
svg { width: 100%; height: 100%; display: block; overflow: visible; }
/* the door scene fills the rounded tile edge to edge, as in awning-card */
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
.alert { display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; color: var(--pf-alert); min-width: 0; }
.alert span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.alert ha-icon { --mdc-icon-size: 15px; flex: none; }
.alert[hidden] { display: none; }
.stats { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 6px; }
.stats:empty { display: none; }
.stats.n1 { grid-template-columns: minmax(0,1fr); }
.tile { display: flex; flex-direction: column; padding: 6px 9px; border-radius: 10px; min-width: 0; background: rgba(127,127,127,.09); cursor: pointer; }
.tile:hover { background: rgba(127,127,127,.16); }
.val { font-size: 14px; font-weight: 600; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-variant-numeric: tabular-nums; }
.lbl { display: flex; align-items: center; gap: 3px; font-size: 11px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lbl ha-icon { --mdc-icon-size: 13px; flex: none; }

.modes { display: grid; grid-template-columns: repeat(var(--n, 4), minmax(0,1fr)); gap: 8px; }
.mode {
  --mc: var(--pf-off); --mt: #fff;
  position: relative; overflow: hidden; border: none; border-radius: 12px; padding: 9px 4px 8px; cursor: pointer; font: inherit;
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  color: var(--secondary-text-color); background: rgba(127,127,127,.10);
  transition: background .3s, color .3s, transform .15s, box-shadow .3s;
}
.mode.light { --mt: #2a1d05; }
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
.modes.ro .mode { cursor: default; }
.modes.ro .mode:not(.active):hover { background: rgba(127,127,127,.10); }
.modes.ro .mode:active { transform: none; }

.controls { display: grid; grid-template-rows: 1fr; transition: grid-template-rows .45s ease, opacity .35s ease, margin .45s ease; }
.controls.closed { grid-template-rows: 0fr; opacity: 0; margin-top: -12px; pointer-events: none; }
.cin { overflow: hidden; min-height: 0; border-radius: 12px; background: rgba(127,127,127,.09); }
.crow { display: flex; align-items: center; gap: 10px; padding: 6px 12px; min-height: 42px; box-sizing: border-box; cursor: pointer; }
.crow + .crow { border-top: 1px solid rgba(127,127,127,.14); }
.crow > .cathead { width: 22px; height: 22px; flex: none; }
.lbl .cathead { width: 14px; height: 14px; flex: none; }
.tl { flex: 1; min-width: 0; font-size: 13px; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tv { font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; }
.crow.in .tv b { color: #66bb6a; } .crow.out .tv b { color: #42a5f5; }

.wrap.m-unlocked { --c: #66bb6a; } .wrap.m-locked_in { --c: #ffb300; } .wrap.m-locked_out { --c: #42a5f5; } .wrap.m-locked_all { --c: #ef5350; }

/* ---- illustration ---- */
.cat, .tail, .eyes, .door, .grass, .paws g, .badge { transform-box: view-box; }
.fur { fill: var(--fur, #8d949c); }
.tail { transform-origin: 36px 119px; }
.cat { transform-origin: 27px 121px; opacity: 0; transform: translate(var(--x, 0px), var(--y, 0px)) scale(var(--s, 1)); transition: opacity .5s, transform .6s ease-in-out; }
.cat.show { opacity: 1; }
.cat.show .tail { animation: tail 2s ease-in-out infinite; }
.eyes { transform-origin: 27px 83.5px; }
.cat.show .eyes { animation: blink 4s ease-in-out infinite; }
.cat.c1 .tail { animation-delay: -.7s; } .cat.c2 .tail { animation-delay: -1.3s; }
.cat.c1 .eyes { animation-delay: -1.6s; } .cat.c2 .eyes { animation-delay: -2.7s; }
.pane { fill: rgba(190,215,232,.28); stroke: rgba(255,255,255,.55); stroke-width: .6; transition: fill .4s; }
.m-locked_all .pane { fill: rgba(239,83,80,.30); }
.door { transform-origin: 78px 74px; }
.latch rect { fill: #ef5350; opacity: 0; transition: opacity .4s; }
.m-locked_all .latch rect { opacity: 1; }
.m-locked_in .latch rect, .m-locked_out .latch rect { fill: #ffb300; opacity: .9; }
.m-locked_out .latch rect { fill: #42a5f5; }
.grass { transform-origin: 78px 109px; animation: sway 4s ease-in-out infinite; }
.paws { opacity: 0; transition: opacity .6s; }
.outside .paws { opacity: 1; }
.outside .paws g { animation: paw 4s ease-in-out infinite; }
.outside .paws g:nth-child(2) { animation-delay: .5s; } .outside .paws g:nth-child(3) { animation-delay: 1s; } .outside .paws g:nth-child(4) { animation-delay: 1.5s; }
.gl { opacity: 0; }
.m-unlocked .gl-unlocked, .m-locked_in .gl-locked_in, .m-locked_out .gl-locked_out, .m-locked_all .gl-locked_all, .s-offline .gl-offline { opacity: 1; }
.s-offline .gl:not(.gl-offline) { opacity: 0; }
.badge { transform-origin: 98px 70px; }
/* a pet just went through: the flap swings, the cat walks into or out of it */
.go-out .door, .come-in .door { animation: swing 1s ease-in-out 2; }
.cat.go { animation: goout 2s ease-in forwards; }
.cat.come { animation: comein 2s ease-out; }
.s-offline .door, .s-offline .grass { animation: none; }

@keyframes tail { 0%,100% { transform: rotate(0); } 50% { transform: rotate(-9deg); } }
@keyframes blink { 0%,90%,100% { transform: scaleY(1); } 94% { transform: scaleY(.1); } }
@keyframes sway { 0%,100% { transform: skewX(0); } 50% { transform: skewX(-6deg); } }
@keyframes paw { 0%,100% { opacity: .35; } 40% { opacity: 1; } }
@keyframes swing { 0%,100% { transform: scaleY(1); } 30% { transform: scaleY(.2); } 60% { transform: scaleY(-.15); } 80% { transform: scaleY(.6); } }
@keyframes goout { 0% { opacity: 1; transform: translate(var(--x, 0px), var(--y, 0px)) scale(var(--s, 1)); } 70% { opacity: 1; transform: translate(42px, -6px) scale(.55); } 100% { opacity: 0; transform: translate(50px, -6px) scale(.45); } }
@keyframes comein { 0% { opacity: 0; transform: translate(50px, -6px) scale(.45); } 30% { opacity: 1; transform: translate(42px, -6px) scale(.55); } 100% { opacity: 1; transform: translate(var(--x, 0px), var(--y, 0px)) scale(var(--s, 1)); } }
@keyframes pulse { 0% { transform: scale(1); opacity: .55; } 100% { transform: scale(2.8); opacity: 0; } }
@keyframes sweep { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
@keyframes ripple { to { transform: scale(2.6); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; } }
@container (max-width: 460px) { .modes .ml { font-size: 11px; } }
@container (max-width: 340px) {
  .illus { width: var(--aircon-illustration-size-small, 84px); grid-row: auto; }
  .stats { grid-column: 1 / -1; }
  .mode .ml { font-size: 11px; }
}
`;
const pfIsLight = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ""));
  if (!m) return false;
  const v = parseInt(m[1], 16);
  return 0.299 * ((v >> 16) & 255) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255) > 170;
};

class PetflapCard extends HTMLElement {
  static async getConfigElement() {
    if (!customElements.get("ha-form") || !customElements.get("ha-entity-picker")) {
      try {
        const helpers = await window.loadCardHelpers?.();
        const tile = await helpers?.createCardElement({ type: "tile", entity: "sun.sun" });
        await tile?.constructor?.getConfigElement?.();
      } catch (e) { /* ignore */ }
    }
    return document.createElement("petflap-card-editor");
  }

  static getStubConfig(hass) {
    const st = hass?.states || {}, ids = Object.keys(st);
    const cfg = { name: (PTXT[pfLang(hass)] || PTXT.en).dev_name };
    const li = ids.find((e) => /^lock\..+_locked_in$/.test(e));
    if (li) {
      const pre = li.slice(5, -"_locked_in".length);
      PF_LOCKS.forEach((m) => { if (st[`lock.${pre}_${m}`]) cfg[m] = `lock.${pre}_${m}`; });
      const bat = ids.find((e) => e.startsWith(`sensor.${pre}`) && /battery/.test(e));
      if (bat) cfg.battery = bat;
      if (st[`binary_sensor.${pre}_connectivity`]) cfg.connectivity = `binary_sensor.${pre}_connectivity`;
    }
    const pets = ids.filter((e) => e.startsWith("binary_sensor.") && st[e]?.attributes?.device_class === "presence" && st[e]?.attributes?.where !== undefined);
    if (pets.length) cfg.pets = pets.map((entity) => ({ entity }));
    return cfg;
  }

  setConfig(config) {
    if (!config) throw new Error("Invalid configuration");
    if (config.pets != null && !Array.isArray(config.pets)) throw new Error("pets must be a list");
    this._config = { ...config };
    this._built = false;
    this._ids = null;
    this._pend = {};
    this._loc = null;
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
  connectedCallback() {
    this._observe();
    // "inside for 12 min" ticks without any state change
    clearInterval(this._tick);
    this._tick = setInterval(() => { if (this._built && !this.hasAttribute("paused")) this._render(); }, 60000);
  }
  disconnectedCallback() { this._io?.disconnect(); this._io = null; clearInterval(this._tick); clearTimeout(this._passT); }
  getCardSize() { return 4; }
  getGridOptions() { return { columns: 12, min_columns: 6, rows: "auto" }; }

  _t(k, vars = {}) {
    const L = PTXT[pfLang(this._hass)] || PTXT.en;
    return Object.entries(vars).reduce((s, [a, b]) => s.replace(`{${a}}`, b), String(L[k] ?? PTXT.en[k] ?? k));
  }
  _st(id) { return typeof id === "string" ? this._hass.states[id] : undefined; }
  _ok(s) { return !!s && !PF_BAD.includes(String(s.state).toLowerCase()); }
  _num(id) { const s = this._st(id); if (!this._ok(s)) return null; const n = Number(s.state); return Number.isFinite(n) ? n : null; }

  _modes() {
    const c = this._config, has = PF_LOCKS.filter((m) => c[m] || c.flap_id);
    return has.length ? ["unlocked", ...has] : [];
  }
  _pets() {
    return (this._config.pets || []).map((p, i) => {
      const cfg = typeof p === "string" ? { entity: p } : p || {};
      const s = this._st(cfg.entity);
      const name = cfg.name || s?.attributes?.friendly_name || `#${i + 1}`;
      const known = this._ok(s);
      const since = s?.attributes?.since ? Date.parse(s.attributes.since) : NaN;
      return { i, cfg, s, name, known, inside: known && s.state === "on", since: Number.isFinite(since) ? since : null };
    });
  }
  _dur(ms) {
    const m = Math.max(0, Math.floor(ms / 60000));
    if (m < 1) return this._t("just_now");
    if (m < 60) return this._t("min", { n: m });
    const h = Math.floor(m / 60);
    if (h < 24) return this._t("hm", { h, m: m % 60 });
    const d = Math.floor(h / 24);
    return h % 24 ? this._t("dh", { d, h: h % 24 }) : this._t("d", { n: d });
  }
  _resolve() {
    const c = this._config;
    const r = { mode: "unknown", offline: false, busy: false };
    const locks = PF_LOCKS.map((m) => ({ m, s: this._st(c[m]) })).filter((x) => x.s);
    const con = this._st(c.connectivity);
    if (con && con.state === "off") r.offline = true;
    if (locks.length) {
      if (locks.every((x) => !this._ok(x.s))) r.offline = r.offline || !con || con.state !== "on";
      const on = locks.find((x) => x.s.state === "locked");
      r.busy = locks.some((x) => ["locking", "unlocking"].includes(x.s.state));
      if (on) r.mode = on.m;
      else if (locks.some((x) => x.s.state === "unlocked")) r.mode = "unlocked";
    }
    // optimistic: show the pressed mode until HA confirms it (max 6 s)
    const p = this._pend.mode;
    if (p) { if (Date.now() - p.at > 6000 || p.v === r.mode) delete this._pend.mode; else r.mode = p.v; }
    return r;
  }

  _build() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    const uid = `pf${Math.random().toString(36).slice(2, 8)}`;
    const modes = this._modes();
    const cols = this._config.columns || modes.length || 1;
    this.shadowRoot.innerHTML = `
      <style>${PSTYLE}</style>
      <ha-card>
        <div class="wrap" id="wrap">
          <div class="top">
            <div class="illus" id="illus"><svg viewBox="0 0 120 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${PF_SVG.replace(/ID-/g, `${uid}-`)}</svg></div>
            <div class="head" id="head">
              <div class="name" id="name"></div>
              <div class="status"><span class="dot"></span><span class="txt" id="status"></span></div>
              <div class="sub" id="sub"></div>
              <div class="alert" id="alert" hidden><ha-icon icon="mdi:alert-circle"></ha-icon><span id="alert-t"></span></div>
            </div>
            <div class="stats" id="stats"></div>
          </div>
          <div class="modes ${this._config.read_only ? "ro" : ""}" id="modes" style="--n:${cols}">
            ${modes.map((m) => {
              const d = PF_MODES[m];
              return `<button class="mode ${pfIsLight(d.color) ? "light" : ""}" data-m="${m}" style="--mc:${d.color}" title="${pfEsc(this._t(`s_${m}`))}">
                <ha-icon icon="${d.icon}"></ha-icon><span class="ml">${pfEsc(this._t(m))}</span></button>`;
            }).join("")}
          </div>
          <div class="controls closed" id="controls"><div class="cin" id="pets"></div></div>
        </div>
      </ha-card>`;
    const $ = (id) => this.shadowRoot.getElementById(id);
    this._el = { wrap: $("wrap"), card: this.shadowRoot.querySelector("ha-card"), name: $("name"), status: $("status"), sub: $("sub"),
      alert: $("alert"), alertT: $("alert-t"), stats: $("stats"), controls: $("controls"), pets: $("pets"),
      modes: [...this.shadowRoot.querySelectorAll(".mode")],
      cats: [0, 1, 2].map((k) => this.shadowRoot.querySelector(`.cat.c${k}`)) };
    this._catCss = []; this._catPos = [];
    if (this._config.hide_buttons || !modes.length) $("modes").style.display = "none";
    $("modes").addEventListener("click", (ev) => {
      const el = ev.target.closest(".mode");
      if (!el || this._config.read_only) return; // read_only: the buttons only show the mode
      this._ripple(el, ev);
      this._press(el.dataset.m, el);
    });
    const flap = () => this._config.locked_all || this._config.locked_in || this._config.locked_out || this._config.connectivity;
    $("illus").addEventListener("click", () => (this._config.tap_action ? this._runAction(this._config.tap_action) : this._moreInfo(this._pets()[0]?.cfg.entity || flap())));
    $("head").addEventListener("click", () => this._moreInfo(flap()));
    $("stats").addEventListener("click", (ev) => { const t = ev.target.closest("[data-entity]"); if (t) this._moreInfo(t.dataset.entity); });
    $("pets").addEventListener("click", (ev) => { const t = ev.target.closest("[data-entity]"); if (t) this._moreInfo(t.dataset.entity); });
    this._tilesHtml = this._petsHtml = null;
    this._built = true;
  }

  _render() {
    if (!this._built) this._build();
    const c = this._config, E = this._el, r = this._resolve(), pets = this._pets();
    const first = pets[0];
    // a pet that just changed sides walks through the flap once (only on a real change, not on the first render)
    const loc = pets.map((p) => (p.known ? (p.inside ? "in" : "out") : "?"));
    const prev = this._loc;
    if (prev) {
      const i = loc.findIndex((l, j) => j < PF_CATS && l !== "?" && prev[j] && prev[j] !== "?" && l !== prev[j]);
      if (i >= 0) {
        clearTimeout(this._passT);
        this._pass = { i, dir: loc[i] === "in" ? "come-in" : "go-out" };
        this._passT = setTimeout(() => { this._pass = null; this._render(); }, 2100);
      }
    }
    this._loc = loc;
    const pass = this._pass && pets[this._pass.i] ? this._pass : null;
    const status = r.offline ? "offline" : r.mode;
    // the first three pets can be drawn; the ones inside sit next to the flap (one going out stays until it is through)
    const shown = pets.slice(0, PF_CATS).filter((p) => p.inside || (pass?.dir === "go-out" && pass.i === p.i));
    const slots = PF_SLOTS[shown.length] || [];
    E.cats.forEach((el, k) => {
      const p = pets[k], rank = shown.indexOf(p);
      if (p) {
        // a cat that leaves keeps its last spot, so it fades out where it sat
        const at = rank >= 0 ? slots[rank] : null;
        if (at) this._catPos[k] = `--x:${at[0]}px;--y:${at[1]}px;--s:${at[2]};`;
        const css = pfCoatVars(p.cfg.color) + (this._catPos[k] || "");
        if (css !== this._catCss[k]) { el.setAttribute("style", css); this._catCss[k] = css; }
      }
      const cls = `cat c${k}${rank >= 0 ? " show" : ""}${pass && pass.i === k ? (pass.dir === "go-out" ? " go" : " come") : ""}`;
      if (el.getAttribute("class") !== cls) el.setAttribute("class", cls);
    });
    const anyOut = pets.some((p) => p.known && !p.inside);
    E.wrap.className = `wrap s-${status} m-${r.mode} ${r.mode !== "unknown" && !r.offline ? "on" : ""} ${shown.length ? "inside" : ""} ${anyOut ? "outside" : ""} ${pass ? pass.dir : ""}`;
    E.card.classList.toggle("on", r.mode !== "unknown" && r.mode !== "unlocked" && !r.offline);
    E.name.textContent = c.name || this._t("dev_name");

    let ptxt = "";
    if (pets.length === 1 && first.known) ptxt = this._t(first.inside ? "is_in" : "is_out", { p: first.name });
    else if (pets.length > 1) {
      const n = pets.filter((p) => p.inside).length;
      ptxt = n === pets.length ? this._t("all_in") : n === 0 ? this._t("all_out") : this._t("n_in", { n, t: pets.length });
    }
    E.status.textContent = this._busyLabel || this._t(`s_${status}`);
    E.sub.textContent = ptxt;

    const alerts = [];
    const bat = this._num(c.battery);
    if (r.offline) alerts.push(this._t("a_offline"));
    if (bat != null && bat <= Number(c.battery_alert ?? 20)) alerts.push(this._t("a_battery", { n: Math.round(bat) }));
    E.alert.hidden = !alerts.length;
    E.alertT.textContent = alerts.join(" · ");

    const tiles = [];
    if (pets.length === 1 && first.known) {
      const where = this._t(first.inside ? "inside" : "outside");
      // value = how long, label = who and where ("2 u 15 min" / "Minoes · binnen"), so it fits a narrow tile
      tiles.push({ e: first.cfg.entity, head: pfHead(first.cfg.color), lbl: `${first.name} · ${where}`,
        v: first.since ? this._dur(Date.now() - first.since) : `${where[0].toUpperCase()}${where.slice(1)}` });
    } // with more pets the rows under the buttons show each one
    if (bat != null && c.show_battery !== false) tiles.push({ e: c.battery, icon: "mdi:battery", lbl: this._t("battery"), v: `${Math.round(bat)} %` });
    const th = tiles.map((t) => `<div class="tile" data-entity="${pfEsc(t.e || "")}"><span class="val">${pfEsc(t.v)}</span><span class="lbl">${t.head || `<ha-icon icon="${t.icon}"></ha-icon>`}${pfEsc(t.lbl)}</span></div>`).join("");
    if (th !== this._tilesHtml) { E.stats.innerHTML = th; E.stats.className = `stats ${tiles.length === 1 ? "n1" : ""}`; this._tilesHtml = th; }

    // with more than one pet, one row per pet in the panel under the buttons
    const ph = pets.length > 1 ? pets.map((p) => `<div class="crow ${p.known ? (p.inside ? "in" : "out") : ""}" data-entity="${pfEsc(p.cfg.entity || "")}">
        ${pfHead(p.cfg.color)}<span class="tl">${pfEsc(p.name)}</span>
        <span class="tv"><b>${pfEsc(p.known ? this._t(p.inside ? "inside" : "outside") : "—")}</b>${p.since ? ` · ${pfEsc(this._t("since", { t: this._dur(Date.now() - p.since) }))}` : ""}</span></div>`).join("") : "";
    if (ph !== this._petsHtml) { E.pets.innerHTML = ph; this._petsHtml = ph; }
    E.controls.classList.toggle("closed", !ph);

    E.modes.forEach((el) => el.classList.toggle("active", el.dataset.m === r.mode && !r.offline));
  }

  _ripple(el, ev) {
    const r = el.getBoundingClientRect(), d = Math.max(r.width, r.height);
    const s = document.createElement("span");
    s.className = "ripple";
    s.style.cssText = `width:${d}px;height:${d}px;left:${(ev.clientX || r.left + r.width / 2) - r.left - d / 2}px;top:${(ev.clientY || r.top + r.height / 2) - r.top - d / 2}px`;
    el.appendChild(s);
    setTimeout(() => s.remove(), 650);
  }

  async _press(m, el) {
    const c = this._config;
    if (!this._hass || !PF_MODES[m]) return;
    el.classList.add("busy");
    this._busyLabel = this._t("sending");
    this._pend.mode = { v: m, at: Date.now() };
    this._render();
    try {
      if (c.flap_id) await this._hass.callService("surepetcare", "set_lock_state", { flap_id: String(c.flap_id), lock_state: m });
      else if (m === "unlocked") {
        // open = unlock whichever mode is locked now
        for (const k of PF_LOCKS) if (this._st(c[k])?.state === "locked") await this._hass.callService("lock", "unlock", { entity_id: c[k] });
      } else await this._hass.callService("lock", "lock", { entity_id: c[m] });
    } catch (e) {
      console.error("petflap-card:", e);
      delete this._pend.mode;
    } finally {
      setTimeout(() => { el.classList.remove("busy"); this._busyLabel = null; this._render(); }, 600);
      setTimeout(() => this._render(), 6100);
    }
  }

  async _runAction(a) {
    const type = a.action;
    if (type === "more-info") return this._moreInfo(a.entity || this._pets()[0]?.cfg.entity);
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
const PED_TXT = {
  en: {
    name: "Name", locked_in: "Lock “locked in” (keep pets in)", locked_out: "Lock “locked out” (keep pets out)", locked_all: "Lock “locked all”",
    flap_id: "Flap id (optional, uses surepetcare.set_lock_state)", battery: "Battery sensor", battery_alert: "Battery warning at (%)", connectivity: "Connectivity sensor",
    columns: "Buttons per row", show_battery: "Show battery tile", hide_buttons: "Hide buttons", read_only: "Buttons only show the mode (nothing happens on click)",
    entity: "Pet (presence sensor)", pet_name: "Name (empty = from the sensor)", color: "Fur colour",
    sec_main: "Flap", sec_pets: "Pets", sec_sensors: "Sensors", sec_layout: "Layout",
    main_hint: "Sure Petcare creates three lock entities per flap; the card shows the one that is locked as the current mode (all unlocked = open).",
    pets_hint: "One row per pet: the Sure Petcare presence sensor (on = inside).",
    add: "Add pet", remove: "Remove", up: "Move up", down: "Move down",
    black: "Black", grey: "Grey", ginger: "Ginger", brown: "Brown", cream: "Cream", white: "White",
    ginger_tabby: "Ginger tabby", ginger_white: "Ginger tabby with white", grey_tabby: "Grey tabby", brown_tabby: "Brown tabby",
    black_white: "Black and white", grey_white: "Grey and white", white_black: "White with black", white_grey: "White with grey",
  },
  nl: {
    name: "Naam", locked_in: "Slot „locked in” (binnen houden)", locked_out: "Slot „locked out” (buiten houden)", locked_all: "Slot „locked all”",
    flap_id: "Luik-id (optioneel, gebruikt surepetcare.set_lock_state)", battery: "Batterij-sensor", battery_alert: "Batterijwaarschuwing vanaf (%)", connectivity: "Verbindingssensor",
    columns: "Knoppen per rij", show_battery: "Batterij-tegel tonen", hide_buttons: "Knoppen verbergen", read_only: "Knoppen tonen alleen de stand (klikken doet niets)",
    entity: "Huisdier (aanwezigheidssensor)", pet_name: "Naam (leeg = van de sensor)", color: "Vachtkleur",
    sec_main: "Kattenluik", sec_pets: "Huisdieren", sec_sensors: "Sensoren", sec_layout: "Weergave",
    main_hint: "Sure Petcare maakt per luik drie slot-entiteiten; de kaart toont de vergrendelde als huidige stand (alle open = open).",
    pets_hint: "Eén regel per huisdier: de aanwezigheidssensor van Sure Petcare (aan = binnen).",
    add: "Huisdier toevoegen", remove: "Verwijderen", up: "Omhoog", down: "Omlaag",
    black: "Zwart", grey: "Grijs", ginger: "Rood", brown: "Bruin", cream: "Crème", white: "Wit",
    ginger_tabby: "Rood gestreept", ginger_white: "Rood gestreept met wit", grey_tabby: "Grijs gestreept", brown_tabby: "Cyperse (bruin gestreept)",
    black_white: "Zwart-wit", grey_white: "Grijs-wit", white_black: "Wit met zwart", white_grey: "Wit met grijs",
  },
};
const PED_STYLE = `
.section { margin-top: 20px; }
.section h3 { margin: 0 0 8px; font-size: 15px; font-weight: 500; color: var(--primary-text-color); }
.hint { font-size: 12px; color: var(--secondary-text-color); margin: 0 0 10px; }
.btn-row { border: 1px solid var(--divider-color, rgba(127,127,127,.3)); border-radius: 12px; padding: 8px 10px 10px; margin-bottom: 10px; }
.btn-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.btn-head .sw { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; color: #fff; flex: none; }
.btn-head .sw .cathead { width: 22px; height: 22px; }
.btn-head .t { flex: 1; font-weight: 500; font-size: 14px; color: var(--primary-text-color); }
.btn-head button, .add { border: none; background: none; cursor: pointer; color: var(--secondary-text-color); border-radius: 50%; width: 32px; height: 32px; display: grid; place-items: center; }
.btn-head button:hover { background: rgba(127,127,127,.15); color: var(--primary-text-color); }
.btn-head button[disabled] { opacity: .3; pointer-events: none; }
.add { width: auto; height: auto; border-radius: 10px; padding: 8px 14px; display: inline-flex; gap: 6px; align-items: center; font: inherit; font-size: 14px; color: var(--primary-color); border: 1px dashed var(--primary-color); }
.add:hover { background: color-mix(in srgb, var(--primary-color) 10%, transparent); }
`;

class PetflapCardEditor extends HTMLElement {
  setConfig(config) { this._config = { ...config }; this._render(); }
  set hass(hass) {
    this._hass = hass;
    this.shadowRoot?.querySelectorAll("ha-form").forEach((f) => (f.hass = hass));
    if (!this._built) this._render();
  }
  _t(k) { return (PED_TXT[pfLang(this._hass)] || PED_TXT.en)[k] ?? PED_TXT.en[k] ?? k; }
  _list() { return Array.isArray(this._config.pets) ? this._config.pets.map((p) => (typeof p === "string" ? { entity: p } : { ...p })) : []; }
  _schemas() {
    const lock = { entity: { domain: "lock" } };
    return {
      main: [
        { name: "name", selector: { text: {} } },
        { name: "locked_in", selector: lock }, { name: "locked_out", selector: lock }, { name: "locked_all", selector: lock },
        { name: "flap_id", selector: { text: {} } },
      ],
      pet: [
        { name: "entity", selector: { entity: { domain: "binary_sensor" } } },
        { type: "grid", name: "", schema: [
          { name: "name", selector: { text: {} } },
          { name: "color", selector: { select: { mode: "dropdown", options: Object.keys(PF_FUR).map((k) => ({ value: k, label: this._t(k) })) } } },
        ] },
      ],
      sensors: [
        { name: "battery", selector: { entity: { domain: "sensor" } } },
        { name: "battery_alert", selector: { number: { min: 1, max: 100, step: 1, mode: "box", unit_of_measurement: "%" } } },
        { name: "connectivity", selector: { entity: { domain: "binary_sensor" } } },
      ],
      layout: [
        { name: "columns", selector: { number: { min: 1, max: 4, step: 1, mode: "slider" } } },
        { type: "grid", name: "", schema: [{ name: "show_battery", selector: { boolean: {} } }, { name: "hide_buttons", selector: { boolean: {} } }] },
        { name: "read_only", selector: { boolean: {} } },
      ],
    };
  }
  _render() {
    if (!this._config) return;
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    const pets = this._list();
    if (this._built && pets.length === this._n) { this._update(pets); return; }
    this._built = true;
    this._n = pets.length;
    const sch = this._schemas();
    this.shadowRoot.innerHTML = `<style>${PED_STYLE}</style>
      <div class="section" style="margin-top:0"><h3>${this._t("sec_main")}</h3><p class="hint">${this._t("main_hint")}</p><div id="f-main"></div></div>
      <div class="section"><h3>${this._t("sec_pets")}</h3><p class="hint">${this._t("pets_hint")}</p>
        <div id="pets">${pets.map((p, i) => `
          <div class="btn-row" data-i="${i}">
            <div class="btn-head"><span class="sw"></span><span class="t"></span>
              <button data-act="up" title="${this._t("up")}" ${i === 0 ? "disabled" : ""}><ha-icon icon="mdi:arrow-up"></ha-icon></button>
              <button data-act="down" title="${this._t("down")}" ${i === pets.length - 1 ? "disabled" : ""}><ha-icon icon="mdi:arrow-down"></ha-icon></button>
              <button data-act="remove" title="${this._t("remove")}"><ha-icon icon="mdi:delete-outline"></ha-icon></button>
            </div>
            <div class="f-pet"></div>
          </div>`).join("")}</div>
        <button class="add" id="add"><ha-icon icon="mdi:plus"></ha-icon>${this._t("add")}</button>
      </div>
      <div class="section"><h3>${this._t("sec_sensors")}</h3><div id="f-sensors"></div></div>
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
      main: mk($("f-main"), sch.main, (v) => this._patch(v, ["name", "locked_in", "locked_out", "locked_all", "flap_id"])),
      sensors: mk($("f-sensors"), sch.sensors, (v) => this._patch(v, ["battery", "battery_alert", "connectivity"])),
      layout: mk($("f-layout"), sch.layout, (v) => this._patch(v, ["columns", "show_battery", "hide_buttons", "read_only"])),
      pets: [...this.shadowRoot.querySelectorAll(".btn-row")].map((row) => mk(row.querySelector(".f-pet"), sch.pet, (v) => this._patchPet(Number(row.dataset.i), v), { name: "pet_name" })),
    };
    $("add").addEventListener("click", () => {
      const st = this._hass?.states || {}, used = this._list().map((p) => p.entity);
      const free = Object.keys(st).find((e) => e.startsWith("binary_sensor.") && st[e]?.attributes?.device_class === "presence" && st[e]?.attributes?.where !== undefined && !used.includes(e));
      this._setPets([...this._list(), free ? { entity: free } : {}]);
    });
    $("pets").addEventListener("click", (ev) => {
      const b = ev.target.closest("button[data-act]");
      if (!b) return;
      const i = Number(b.closest(".btn-row").dataset.i), list = this._list();
      if (b.dataset.act === "remove") list.splice(i, 1);
      if (b.dataset.act === "up" && i > 0) [list[i - 1], list[i]] = [list[i], list[i - 1]];
      if (b.dataset.act === "down" && i < list.length - 1) [list[i + 1], list[i]] = [list[i], list[i + 1]];
      this._setPets(list);
    });
    this._update(pets);
  }
  _update(pets) {
    const c = this._config;
    this._forms.main.data = { name: c.name, locked_in: c.locked_in, locked_out: c.locked_out, locked_all: c.locked_all, flap_id: c.flap_id };
    this._forms.sensors.data = { battery: c.battery, battery_alert: c.battery_alert ?? 20, connectivity: c.connectivity };
    this._forms.layout.data = { columns: c.columns, show_battery: c.show_battery !== false, hide_buttons: !!c.hide_buttons, read_only: !!c.read_only };
    const rows = this.shadowRoot.querySelectorAll(".btn-row");
    pets.forEach((p, i) => {
      this._forms.pets[i].data = { entity: p.entity, name: p.name, color: p.color || "grey" };
      rows[i].querySelector(".sw").innerHTML = pfHead(p.color);
      rows[i].querySelector(".sw").style.background = "rgba(127,127,127,.15)";
      rows[i].querySelector(".t").textContent = p.name || this._hass?.states?.[p.entity]?.attributes?.friendly_name || p.entity || `#${i + 1}`;
    });
  }
  _patchPet(i, v) {
    const list = this._list(), p = { ...list[i] };
    ["entity", "name", "color"].forEach((k) => {
      let val = v[k];
      if (k === "color" && val === "grey") val = undefined; // default → omit
      if (val === "" || val == null) delete p[k]; else p[k] = val;
    });
    const { entity, ...rest } = p; // `entity` first, YAML-only keys of the pet stay
    list[i] = entity ? { entity, ...rest } : rest;
    this._setPets(list);
  }
  _setPets(list) { this._emit({ ...this._config, pets: list }); }
  _patch(v, keys) {
    const c = { ...this._config };
    keys.forEach((k) => {
      let val = v[k];
      if (k === "show_battery") val = val === false ? false : undefined;
      if (k === "hide_buttons" || k === "read_only") val = val ? true : undefined;
      if (k === "battery_alert" && Number(val) === 20) val = undefined;
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

customElements.define("petflap-card-editor", PetflapCardEditor);
customElements.define("petflap-card", PetflapCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "petflap-card", name: "Pet flap card", description: "Animated SureFlap pet / cat flap: lock mode buttons, whether your cat is in or out, battery", preview: true });
console.info(`%c PETFLAP-CARD %c ${PF_VERSION} `, "color:#fff;background:#66bb6a;font-weight:700", "color:#66bb6a");
