// Build dist/ha-cards.js for HACS: the three card files concatenated, each in its own block scope
// so their top-level names can't collide. The cards themselves stay single standalone files.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cards = ["aircon-card", "heating-card", "awning-card", "dishwasher-card", "washer-card", "dryer-card", "hood-card", "waste-card"];
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

let out = `/* ha-cards ${pkg.version} — ${cards.join(", ")}. Built by tools/build-hacs.mjs; edit cards/*.js instead. */\n`;
for (const name of cards) {
  const src = readFileSync(join(root, "cards", `${name}.js`), "utf8");
  if (/^\s*(import|export)\s/m.test(src)) throw new Error(`${name}.js must not use import/export`);
  out += `\n/* ===== ${name}.js ===== */\n{\n${src}\n}\n`;
}
mkdirSync(join(root, "dist"), { recursive: true });
writeFileSync(join(root, "dist", "ha-cards.js"), out);
console.log(`dist/ha-cards.js (${(out.length / 1024).toFixed(1)} KB)`);
