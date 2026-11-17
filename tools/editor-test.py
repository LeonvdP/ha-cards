#!/usr/bin/env python3
"""Drives a card's visual editor with the fake <ha-form> from preview/editor.html and prints every
config-changed payload, so you can check the YAML the editor produces.
Usage: python3 tools/editor-test.py awning
Edit the STEPS below (or pass your own JS as 2nd arg). In the JS: `ed` is the editor, `form(sel)` returns the
fake ha-form inside it; call form('#f-layout').set_('show_sensor', false) to simulate a user edit."""
import asyncio, os, pathlib, sys
from playwright.async_api import async_playwright
card = sys.argv[1] if len(sys.argv) > 1 else "aircon"
STEPS = sys.argv[2] if len(sys.argv) > 2 else {
    "aircon": "form('#f-main').set_('state_entity','input_select.airco_modus'); sr.querySelector('#add').click();",
    "heating": "sr.querySelector('#add').click(); form('#f-boiler').set_('burner','binary_sensor.toon_burner');",
    "awning": "form('#f-motion').set_('travel_time',52); form('#f-motion').set_('fabric','anthracite_white'); form('#f-layout').set_('show_sensor',false);",
}[card]
PAGE = (pathlib.Path(__file__).resolve().parent.parent / "preview" / "editor.html").as_uri() + f"?card={card}"

async def main():
    async with async_playwright() as p:
        kw = {"executable_path": os.environ["CHROME"]} if os.environ.get("CHROME") else {}
        b = await p.chromium.launch(**kw); pg = await b.new_page()
        pg.on("pageerror", lambda e: print("PAGE ERROR:", e))
        await pg.goto(PAGE)
        out = await pg.evaluate(f"""async()=>{{
          const out=[]; const C=customElements.get('{card}-card'); const ed=await C.getConfigElement();
          ed.hass={{language:'nl',locale:{{language:'nl'}},states:{{}}}}; document.body.appendChild(ed);
          ed.addEventListener('config-changed',e=>out.push(JSON.stringify(e.detail.config)));
          ed.setConfig({{type:'custom:{card}-card',...C.getStubConfig({{states:{{}}}})}});
          const sr=ed.shadowRoot, form=(sel)=>sr.querySelector(sel+' ha-form');
          {STEPS}
          return out; }}""")
        print("\n".join(out) or "(no config-changed events)")
        await b.close()
asyncio.run(main())
