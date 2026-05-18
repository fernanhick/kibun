#!/usr/bin/env python3
"""
Generate all required app icon variants from playstore-icon.png.
Targets:
  - assets/icons/android/mipmap-*/ic_launcher.png (all densities)
  - assets/icons/android/mipmap-*/ic_launcher_round.png (same)
  - assets/icons/android/mipmap-*/ic_launcher_foreground.png (safe-zone scaled, transparent bg)
  - assets/icons/android/mipmap-anydpi-v26/*.xml (adaptive icon XML refs)
  - assets/icons/android/drawable/ic_launcher_background.xml
  - assets/icons/apple-devices/AppIcon.appiconset/icon-ios-1024x1024.png
  - android/app/src/main/res/mipmap-*/  (direct native copy)
"""

import os
import shutil
from pathlib import Path
from PIL import Image

BASE = Path(__file__).parent.parent
SRC_ICON = BASE / "assets" / "icons" / "playstore-icon.png"

# Android density → (launcher px, foreground canvas px)
ANDROID_DENSITIES = {
    "mipmap-mdpi":    (48,  108),
    "mipmap-hdpi":    (72,  162),
    "mipmap-xhdpi":   (96,  216),
    "mipmap-xxhdpi":  (144, 324),
    "mipmap-xxxhdpi": (192, 432),
}

BACKGROUND_COLOR = "#4A86FF"


def hex_to_rgb(h: str):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def make_launcher(src: Image.Image, size: int) -> Image.Image:
    """Resize to launcher size with high-quality Lanczos resampling."""
    return src.resize((size, size), Image.LANCZOS)


def make_foreground(src: Image.Image, canvas_size: int) -> Image.Image:
    """
    Scale icon to the 72/108 safe-zone and center it on a transparent canvas.
    This prevents the icon from being clipped by adaptive shapes.
    """
    safe = int(canvas_size * 72 / 108)
    icon = src.resize((safe, safe), Image.LANCZOS)

    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    offset = (canvas_size - safe) // 2
    canvas.paste(icon, (offset, offset), icon if icon.mode == "RGBA" else None)
    return canvas


def save_png(img: Image.Image, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(str(path), "PNG", optimize=True)
    print(f"  ✓ {path.relative_to(BASE)}")


IC_LAUNCHER_XML = """\
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
"""

IC_LAUNCHER_ROUND_XML = """\
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
"""

IC_LAUNCHER_BACKGROUND_XML = f"""\
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android">
    <solid android:color="{BACKGROUND_COLOR}"/>
</shape>
"""


def write_xml(content: str, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print(f"  ✓ {path.relative_to(BASE)}")


def main():
    print(f"\n📂 Source: {SRC_ICON}\n")

    # Load source
    src = Image.open(SRC_ICON).convert("RGBA")
    print(f"  Source size: {src.size}\n")

    # ── Android assets ────────────────────────────────────────────────────────
    print("── Android icon variants ──────────────────────────────────")
    android_assets = BASE / "assets" / "icons" / "android"

    for density, (launcher_px, fg_px) in ANDROID_DENSITIES.items():
        density_dir = android_assets / density
        launcher = make_launcher(src, launcher_px)
        foreground = make_foreground(src, fg_px)

        save_png(launcher,    density_dir / "ic_launcher.png")
        save_png(launcher,    density_dir / "ic_launcher_round.png")
        save_png(foreground,  density_dir / "ic_launcher_foreground.png")

    # XML files
    write_xml(IC_LAUNCHER_XML,        android_assets / "mipmap-anydpi-v26" / "ic_launcher.xml")
    write_xml(IC_LAUNCHER_ROUND_XML,  android_assets / "mipmap-anydpi-v26" / "ic_launcher_round.xml")
    write_xml(IC_LAUNCHER_BACKGROUND_XML, android_assets / "drawable" / "ic_launcher_background.xml")

    # ── iOS assets ────────────────────────────────────────────────────────────
    print("\n── iOS icon variants ──────────────────────────────────────")
    ios_dir = BASE / "assets" / "icons" / "apple-devices" / "AppIcon.appiconset"
    ios_src = src.resize((1024, 1024), Image.LANCZOS)
    save_png(ios_src, ios_dir / "icon-ios-1024x1024.png")

    # ── Copy to native Android res/ ──────────────────────────────────────────
    print("\n── Copying to android/app/src/main/res/ ───────────────────")
    native_res = BASE / "android" / "app" / "src" / "main" / "res"

    density_copies = [*ANDROID_DENSITIES.keys()]
    for density in density_copies:
        src_dir  = android_assets / density
        dest_dir = native_res / density
        dest_dir.mkdir(parents=True, exist_ok=True)
        for fname in ("ic_launcher.png", "ic_launcher_round.png", "ic_launcher_foreground.png"):
            src_file  = src_dir / fname
            dest_file = dest_dir / fname
            shutil.copy2(src_file, dest_file)
            print(f"  ✓ {dest_file.relative_to(BASE)}")

    # Copy XML files to native
    for fname in ("ic_launcher.xml", "ic_launcher_round.xml"):
        s = android_assets / "mipmap-anydpi-v26" / fname
        d = native_res / "mipmap-anydpi-v26" / fname
        d.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(s, d)
        print(f"  ✓ {d.relative_to(BASE)}")

    bg_src  = android_assets / "drawable" / "ic_launcher_background.xml"
    bg_dest = native_res / "drawable" / "ic_launcher_background.xml"
    bg_dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(bg_src, bg_dest)
    print(f"  ✓ {bg_dest.relative_to(BASE)}")

    # ── Clean up stale fake files ─────────────────────────────────────────────
    print("\n── Cleaning up ────────────────────────────────────────────")
    for stale in ("android-icon.png", "ios-icon.png"):
        p = BASE / "assets" / "icons" / stale
        if p.exists():
            p.unlink()
            print(f"  🗑  Removed {p.relative_to(BASE)}")

    print("\n✅ All icons generated successfully!\n")


if __name__ == "__main__":
    main()
