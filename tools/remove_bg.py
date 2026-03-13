#!/usr/bin/env python3
import os, sys, io
from pathlib import Path
from PIL import Image
from rembg import remove

IMG_DIR = Path(__file__).resolve().parent.parent / "assets" / "img"

def process_image(filepath):
    name = filepath.name
    print("  Processing: " + name + " ... ", end="", flush=True)
    try:
        with open(filepath, "rb") as fh:
            input_data = fh.read()
        output_data = remove(input_data)
        img = Image.open(io.BytesIO(output_data)).convert("RGBA")
        corners = [
            img.getpixel((0, 0)),
            img.getpixel((img.width - 1, 0)),
            img.getpixel((0, img.height - 1)),
            img.getpixel((img.width - 1, img.height - 1)),
        ]
        all_transparent = all(c[3] < 10 for c in corners)
        img.save(filepath, "WEBP", quality=90, lossless=False)
        new_size = filepath.stat().st_size
        status = "OK" if all_transparent else "WARN: corners not fully transparent"
        print(status + " (" + str(new_size) + " bytes)")
        return all_transparent
    except Exception as e:
        print("ERROR: " + str(e))
        return False

def main():
    if not IMG_DIR.exists():
        print("ERROR: " + str(IMG_DIR) + " not found")
        sys.exit(1)
    print("Image directory: " + str(IMG_DIR))
    webp_files = sorted(IMG_DIR.glob("*.webp"))
    if not webp_files:
        print("No .webp files found")
        sys.exit(1)
    print("Found " + str(len(webp_files)) + " files")
    print("")
    results = {}
    for fp in webp_files:
        results[fp.name] = process_image(fp)
    print("")
    print("=" * 50)
    print("SUMMARY:")
    ok_count = sum(1 for v in results.values() if v)
    warn_count = sum(1 for v in results.values() if not v)
    print("  OK: " + str(ok_count) + " / " + str(len(results)))
    if warn_count > 0:
        print("  WARN: " + str(warn_count))
        for name, passed in results.items():
            if not passed:
                print("    - " + name)
    print("")
    print("Done. Check images in browser for transparency.")

if __name__ == "__main__":
    main()
