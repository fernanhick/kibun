#!/usr/bin/env python3
"""
Build the whole store screenshot set from screenshot-set.json.

    python scripts/aso/build_set.py                              # every locale x target -> screenshots/final/
    python scripts/aso/build_set.py --locales es,pt --targets play
    python scripts/aso/build_set.py --locales en --only 05-write --out screenshots/_preview/set

Output: screenshots/final/<locale>/<target>/<frame-id>.png
  ios   1290x2796  phone captures, device frame
  play  1080x1920  phone captures, card
  ipad  2064x2752  tablet captures, card
A locale whose captures are not all on disk is skipped with a list of what is missing.
"""

import argparse
import importlib.util
import json
import os

_HERE = os.path.dirname(os.path.abspath(__file__))
_REPO = os.path.abspath(os.path.join(_HERE, "..", ".."))

_spec = importlib.util.spec_from_file_location("compose", os.path.join(_HERE, "compose.py"))
compose = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(compose)


def main():
    p = argparse.ArgumentParser(description="Compose every frame of the store screenshot set")
    p.add_argument("--set", default=os.path.join(_HERE, "screenshot-set.json"))
    p.add_argument("--locales", help="Comma-separated locales (default: all in the set)")
    p.add_argument("--targets", default="ios,play,ipad")
    p.add_argument("--out", default=os.path.join(_REPO, "screenshots", "final"))
    p.add_argument("--only", help="Comma-separated frame ids")
    args = p.parse_args()

    spec = json.load(open(args.set, encoding="utf-8"))
    locales = [l.strip() for l in args.locales.split(",")] if args.locales else list(spec["capture_dirs"])
    targets = [t.strip() for t in args.targets.split(",") if t.strip()]
    only = {f.strip() for f in args.only.split(",")} if args.only else None
    frames = [f for f in spec["frames"] if not only or f["id"] in only]

    for locale in locales:
        dirs = spec["capture_dirs"][locale]
        devices = {("ipad" if t == "ipad" else "phone") for t in targets}
        # A frame can be limited to some locales ("locales": [...]); omitted means all.
        loc_frames = [f for f in frames if locale in f.get("locales", spec["capture_dirs"])]
        missing = [os.path.join(dirs[d], f["capture"]) for f in loc_frames for d in sorted(devices)
                   if not os.path.exists(os.path.join(_REPO, dirs[d], f["capture"]))]
        missing += [f["plate"] for f in loc_frames if not os.path.exists(os.path.join(_REPO, f["plate"]))]
        if missing:
            print(f"SKIP {locale}: missing inputs\n  " + "\n  ".join(sorted(set(missing))))
            continue
        for target in targets:
            device = "ipad" if target == "ipad" else "phone"
            out_dir = os.path.join(args.out, locale, target)
            os.makedirs(out_dir, exist_ok=True)
            for f in loc_frames:
                verb, desc = f["copy"][locale]
                compose.compose(
                    spec["bg"], verb, desc,
                    os.path.join(_REPO, dirs[device], f["capture"]),
                    os.path.join(out_dir, f"{f['id']}.png"),
                    bg_image=os.path.join(_REPO, f["plate"]),
                    tint=spec.get("tint", 0),
                    status_bar=spec["status_bar"][device],
                    target=target,
                )


if __name__ == "__main__":
    main()
