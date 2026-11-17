#!/usr/bin/env python3
"""Screenshot a preview page, optionally after running some JS.
Usage: python3 tools/screenshot.py preview/awning.html out.png ["sim('heat')"] [--light] [--wait 1500]
Needs: pip install playwright && playwright install chromium (or set CHROME=/path/to/chrome)."""
import argparse, asyncio, os, pathlib
from playwright.async_api import async_playwright

ap = argparse.ArgumentParser()
ap.add_argument("page"); ap.add_argument("out"); ap.add_argument("js", nargs="?")
ap.add_argument("--light", action="store_true"); ap.add_argument("--wait", type=int, default=1200)
ap.add_argument("--width", type=int, default=900); ap.add_argument("--scale", type=float, default=1)
a = ap.parse_args()

async def main():
    async with async_playwright() as p:
        kw = {"executable_path": os.environ["CHROME"]} if os.environ.get("CHROME") else {}
        b = await p.chromium.launch(**kw)
        pg = await b.new_page(viewport={"width": a.width, "height": 800}, device_scale_factor=a.scale)
        pg.on("pageerror", lambda e: print("PAGE ERROR:", e))
        await pg.goto(pathlib.Path(a.page).resolve().as_uri()); await pg.wait_for_timeout(600)
        if a.light: await pg.evaluate("document.body.classList.add('light')")
        if a.js: await pg.evaluate(a.js)
        await pg.wait_for_timeout(a.wait)
        await pg.screenshot(path=a.out, full_page=True)
        await b.close()
asyncio.run(main())
