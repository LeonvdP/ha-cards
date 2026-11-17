#!/usr/bin/env python3
"""Make the README images: an animated GIF (dark theme) and a still PNG (light theme) for every card.
Usage: python3 tools/capture.py [card ...]        -> docs/images/<card>.gif and docs/images/<card>.png
Needs: pip install playwright && playwright install chromium (or CHROME=/path/to/chrome), and ffmpeg on PATH.
Runs in CI (.github/workflows/screenshots.yml) whenever a card or preview changes.

CSS-animated cards are captured deterministically: every animation is paused and stepped frame by frame, so the GIF
loops seamlessly (keep animation durations a divisor of SECONDS). The awning is drawn by JS, so it is recorded live."""
import asyncio, os, pathlib, subprocess, sys, tempfile, time
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "images"
FPS, SECONDS, GIF_SCALE, PNG_SCALE, WIDTH, PAD = 15, 4, 1.5, 2, 460, 10
OPEN = "document.querySelector('awning-card').shadowRoot.querySelector('.mode[data-act=open]').click()"
CARDS = {  # name: (preview page, JS to set the state, "css" | "live", seconds to wait before the still)
    "aircon": ("aircon.html", "", "css", 1.5),
    "heating": ("heating.html", "sim('heat')", "css", 1.5),
    "awning": ("awning.html", OPEN, "live", 6),
    "dishwasher": ("dishwasher.html", "sim('run')", "css", 1.5),
    "washer": ("washer.html", "sim('run')", "css", 1.5),
    "dryer": ("dryer.html", "sim('run')", "css", 1.5),
    "hood": ("hood.html", "sim('s2'); sim('light'); sim('cook')", "css", 1.5),
}

# all running animations, including the ones inside shadow roots
ANIMS = """() => { const out = new Set(document.getAnimations());
  const walk = (r) => r.querySelectorAll('*').forEach((n) => { if (n.shadowRoot) { n.shadowRoot.getAnimations().forEach((a) => out.add(a)); walk(n.shadowRoot); } });
  walk(document); return [...out]; }"""


async def clip(pg):
    box = await pg.locator("#grid > :first-child").bounding_box()
    return {"x": box["x"] - PAD, "y": box["y"] - PAD, "width": box["width"] + 2 * PAD, "height": box["height"] + 2 * PAD}


async def open_page(browser, page, js, light, scale):
    pg = await browser.new_page(viewport={"width": WIDTH, "height": 900}, device_scale_factor=scale, reduced_motion="no-preference")
    pg.on("pageerror", lambda e: print(f"  PAGE ERROR ({page}):", e))
    await pg.goto((ROOT / "preview" / page).as_uri())
    await pg.wait_for_timeout(600)
    await pg.add_style_tag(content="body > h1, body > p, body > .bar { display: none !important; }")
    if light:
        await pg.evaluate("document.body.classList.add('light')")
    if js:
        await pg.evaluate(js)
    return pg


async def gif(browser, name, page, js, mode):
    pg = await open_page(browser, page, js, False, GIF_SCALE)
    frames = pathlib.Path(tempfile.mkdtemp(prefix=f"{name}-"))
    n = FPS * SECONDS
    if mode == "css":
        await pg.wait_for_timeout(1800)  # let transitions settle
        await pg.evaluate(f"() => {{ window.__a = ({ANIMS})(); window.__a.forEach((a) => {{ a.pause(); a.__t0 = a.currentTime || 0; }}); }}")
        c = await clip(pg)
        for i in range(n):
            await pg.evaluate(f"() => window.__a.forEach((a) => {{ a.currentTime = a.__t0 + {i * 1000 / FPS}; }})")
            await pg.screenshot(path=str(frames / f"f{i:03d}.png"), clip=c)
        fps = FPS
    else:
        await pg.wait_for_timeout(1200)
        c = await clip(pg)
        t0 = time.monotonic()
        for i in range(n):
            await pg.screenshot(path=str(frames / f"f{i:03d}.png"), clip=c)
            await asyncio.sleep(max(0, t0 + (i + 1) / FPS - time.monotonic()))
        fps = round(n / (time.monotonic() - t0), 2)
    await pg.close()
    out = OUT / f"{name}.gif"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(fps), "-i", str(frames / "f%03d.png"),
                    "-vf", "split[a][b];[a]palettegen=stats_mode=diff:max_colors=200[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle",
                    "-loop", "0", str(out)], check=True)
    print(f"  {out.relative_to(ROOT)}  {out.stat().st_size // 1024} KB, {n} frames @ {fps} fps")


async def png(browser, name, page, js, wait):
    pg = await open_page(browser, page, js, True, PNG_SCALE)
    await pg.wait_for_timeout(int(wait * 1000))
    out = OUT / f"{name}.png"
    await pg.screenshot(path=str(out), clip=await clip(pg))
    await pg.close()
    print(f"  {out.relative_to(ROOT)}  {out.stat().st_size // 1024} KB")


async def main():
    names = sys.argv[1:] or list(CARDS)
    OUT.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        kw = {"executable_path": os.environ["CHROME"]} if os.environ.get("CHROME") else {}
        browser = await p.chromium.launch(**kw)
        for name in names:
            page, js, mode, wait = CARDS[name]
            print(name)
            await gif(browser, name, page, js, mode)
            await png(browser, name, page, js, wait)
        await browser.close()

asyncio.run(main())
