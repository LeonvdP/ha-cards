#!/usr/bin/env python3
"""Regression check for the awning animation loop: counts _draw() calls per second while opening.
Healthy: ~30/s. The v1.3 bug (duplicate requestAnimationFrame loops) produced tens of thousands per second.
Also checks that 200 unrelated hass updates cause 0 re-renders."""
import asyncio, os, pathlib
from playwright.async_api import async_playwright
PAGE = (pathlib.Path(__file__).resolve().parent.parent / "preview" / "awning.html").as_uri()

async def main():
    async with async_playwright() as p:
        kw = {"executable_path": os.environ["CHROME"]} if os.environ.get("CHROME") else {}
        b = await p.chromium.launch(**kw); pg = await b.new_page()
        await pg.goto(PAGE); await pg.wait_for_timeout(500)
        await pg.evaluate("""()=>{const el=document.querySelector('awning-card');window.__d=0;const d=el._draw.bind(el);el._draw=(x)=>{window.__d++;d(x)};
          cfg={...cfg,travel_time:60};el.setConfig(cfg);el.hass=hass;el.shadowRoot.querySelector('.mode[data-act=open]').click();}""")
        rates = []
        for _ in range(4):
            await pg.evaluate("window.__d=0"); await pg.wait_for_timeout(1000); rates.append(await pg.evaluate("window.__d"))
        print("draws/s while opening:", rates, "OK" if max(rates) <= 70 else "TOO HIGH")
        r = await pg.evaluate("""()=>{const el=document.querySelector('awning-card');let n=0;const o=el._render.bind(el);el._render=()=>{n++;o()};
          for(let i=0;i<200;i++){states['sensor.unrelated']=S(String(i));push()} return n}""")
        print("renders for 200 unrelated updates:", r, "OK" if r == 0 else "SHOULD BE 0")
        await b.close()
asyncio.run(main())
