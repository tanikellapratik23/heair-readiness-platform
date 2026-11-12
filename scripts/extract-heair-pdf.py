#!/usr/bin/env python3
"""Extract a text-based HEAIR PDF into the page manifest used by the local importer.

Run outside production: python3 scripts/extract-heair-pdf.py PAPER.pdf OUTPUT.json
Requires pypdf: python3 -m pip install pypdf
"""
import json
import sys

try:
    from pypdf import PdfReader
except ImportError as error:
    raise SystemExit("pypdf is required: python3 -m pip install pypdf") from error

if len(sys.argv) != 3:
    raise SystemExit("Usage: python3 scripts/extract-heair-pdf.py PAPER.pdf OUTPUT.json")

reader = PdfReader(sys.argv[1])
pages = []
for number, page in enumerate(reader.pages, start=1):
    text = (page.extract_text() or "").strip()
    if text:
        pages.append({"page": number, "section": f"PDF page {number}", "text": text})

if not pages:
    raise SystemExit("No extractable text was found. Use reviewed OCR text before importing.")

with open(sys.argv[2], "w", encoding="utf-8") as output:
    json.dump({"pages": pages}, output, ensure_ascii=False, indent=2)

print(f"Extracted {len(pages)} pages to {sys.argv[2]}")
