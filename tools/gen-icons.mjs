// Scans cards/*.js for "mdi:xxx" icon names and writes preview/icons.js with just those SVG paths,
// so the preview pages can draw icons without Home Assistant. Run after adding a new icon: npm run icons
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import * as mdi from "@mdi/js";

const names = new Set();
for (const f of readdirSync("cards")) {
  if (!f.endsWith(".js")) continue;
  for (const m of readFileSync(`cards/${f}`, "utf8").matchAll(/mdi:([a-z0-9]+(?:-[a-z0-9]+)*)/g)) names.add(m[1]);
}
const toKey = (n) => "mdi" + n.split("-").map((p) => p[0].toUpperCase() + p.slice(1)).join("");
const out = {}, missing = [];
for (const n of [...names].sort()) (mdi[toKey(n)] ? (out[n] = mdi[toKey(n)]) : missing.push(n));
writeFileSync("preview/icons.js", `window.ICONS = ${JSON.stringify(out)};\n`);
console.log(`preview/icons.js: ${Object.keys(out).length} icons` + (missing.length ? ` (not found: ${missing.join(", ")})` : ""));
