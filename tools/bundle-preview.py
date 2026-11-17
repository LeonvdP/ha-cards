#!/usr/bin/env python3
"""Inline icons.js, _stubs.js and the card into one self-contained HTML file (for publishing a preview
as a single page, e.g. a claude.ai artifact). Usage: python3 tools/bundle-preview.py awning  -> dist/awning-preview.html"""
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
name = sys.argv[1]
src = (root / "preview" / f"{name}.html").read_text()
def inline(m):
    path = (root / "preview" / m.group(1)).resolve()
    return f"<script>{path.read_text()}</script>"
out = re.sub(r'<script src="([^"]+)"></script>', inline, src)
(root / "dist").mkdir(exist_ok=True)
dst = root / "dist" / f"{name}-preview.html"
dst.write_text(out)
print(dst)
