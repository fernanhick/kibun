#!/usr/bin/env python3
"""
Google Play feature graphic — 1024 x 500, one per locale.

    python scripts/aso/feature_graphic.py                    # all locales
    python scripts/aso/feature_graphic.py --locales en,de --plate screenshots/backgrounds/bloom-sky-52000.png

Output: screenshots/final/<locale>/play/feature-graphic.png

Play shows this asset cropped in several places and overlays the app icon and title on
some surfaces, so everything that matters stays inside SAFE_INSET of the edges, and the
right half is kept clear of busy background detail for the wordmark.

The mascot is a frame of the app's own mascot-happy.webp; the background is a plate from
gen_background.py, reused rather than regenerated so this needs no GPU.
"""

import argparse
import json
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageSequence, ImageStat

_HERE = os.path.dirname(os.path.abspath(__file__))
_REPO = os.path.abspath(os.path.join(_HERE, "..", ".."))

W, H = 1024, 500
SAFE_INSET = 48                    # keep text and mascot this far from every edge
MASCOT_FRAME = 0                   # eyes open, facing the viewer; later frames are mid-blink
MASCOT_HEIGHT = 372                # px tall inside the graphic
MASCOT_LEFT = 64
NAME_TAG_GAP = 26                  # between the wordmark baseline and the tagline
TAG_LINE_GAP = 12
PLATE = "screenshots/backgrounds/bloom-sky-52000.png"
BRAND = "#B0496A"
SCRIM_MIN, SCRIM_MAX = 0.52, 0.66  # darkening over the text half, for white type
                                   # (0.34 blended the blossom band to 140; 0.52 reaches ~118)
TEXT_BAND_MAX_L = 118              # shade until the text half is at least this dark

# Tagline per locale: the app's own vocabulary (ánimo / humor / Stimmung), informal register.
COPY = {
    "en": ("Kibun", "Your kawaii mood companion"),
    "es": ("Kibun", "Tu compañero kawaii de ánimo"),
    "pt": ("Kibun", "Seu companheiro kawaii de humor"),
    "de": ("Kibun", "Dein kawaii Stimmungsbegleiter"),
}

import importlib.util

_spec = importlib.util.spec_from_file_location("compose", os.path.join(_HERE, "compose.py"))
compose = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(compose)


def mascot(height):
    path = os.path.join(_REPO, "assets", "webp animation", "mascot-happy.webp")
    src = Image.open(path)
    frame = None
    for i, f in enumerate(ImageSequence.Iterator(src)):
        if i == MASCOT_FRAME:
            frame = f.convert("RGBA").copy()
            break
    if frame is None:
        frame = Image.open(path).convert("RGBA")
    frame = frame.crop(frame.getbbox())
    w = round(frame.width * height / frame.height)
    return frame.resize((w, height), Image.LANCZOS)


def background(plate_path):
    src = Image.open(os.path.join(_REPO, plate_path)).convert("RGB")
    scale = max(W / src.width, H / src.height)
    src = src.resize((round(src.width * scale), round(src.height * scale)), Image.LANCZOS)
    # Plates are portrait with their blossom framing at the top: crop that band, not the
    # bare middle, or the graphic comes out as flat sky.
    left = (src.width - W) // 2
    top = 0
    out = src.crop((left, top, left + W, top + H))

    # Darken from the right so the wordmark side holds white type, feathered to the left.
    band = out.crop((W // 2, 0, W, H))
    band_l = ImageStat.Stat(band.convert("L")).mean[0]
    alpha = min(max(1 - TEXT_BAND_MAX_L / max(band_l, 1), SCRIM_MIN), SCRIM_MAX)
    shade = tuple(int(c * 0.35) for c in ImageStat.Stat(band).mean)
    grad = Image.new("L", (W, 1))
    for x in range(W):
        t = min(max((x - W * 0.22) / (W * 0.5), 0.0), 1.0)
        grad.putpixel((x, 0), int(255 * alpha * (t * t * (3 - 2 * t))))
    mask = grad.resize((W, H))
    out = Image.composite(Image.new("RGB", (W, H), shade), out, mask)
    return out.convert("RGBA"), shade


def build(locale, plate_path, out_path):
    canvas, shade = background(plate_path)
    shiba = mascot(MASCOT_HEIGHT)

    # Mascot low-left, sitting on the baseline with a soft contact shadow.
    mx, my = MASCOT_LEFT, H - SAFE_INSET - shiba.height + 18
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).ellipse(
        [mx + 26, my + shiba.height - 26, mx + shiba.width - 26, my + shiba.height + 16],
        fill=(*shade, 120))
    canvas = Image.alpha_composite(canvas, shadow.filter(ImageFilter.GaussianBlur(16)))
    canvas.alpha_composite(shiba, (mx, my))

    # Wordmark + tagline on the right, centred in the space beside the mascot.
    name, tagline = COPY[locale]
    text_left = mx + shiba.width + 56
    text_w = W - SAFE_INSET - text_left
    centre = text_left + text_w // 2
    probe = ImageDraw.Draw(canvas)

    def fits(font, text):
        b = probe.textbbox((0, 0), text, font=font, anchor="ls")
        return b[2] - b[0] <= text_w

    name_font = compose.fit_font(name, text_w, 132, 70)
    while not fits(name_font, name) and name_font.size > 70:
        name_font = ImageFont.truetype(compose.FONT_PATH, name_font.size - 4)
    tag_font = compose.fit_font(tagline.upper(), text_w, 40, 20)
    tag_lines = compose.word_wrap(probe, tagline.upper(), tag_font, text_w)

    # Stack: wordmark cap height, gap, then the tagline lines on a fixed pitch.
    nb = probe.textbbox((0, 0), name, font=name_font, anchor="ls")
    name_cap = -nb[1]
    tb = probe.textbbox((0, 0), "H", font=tag_font, anchor="ls")
    tag_cap = -tb[1]
    tag_pitch = tag_cap + TAG_LINE_GAP
    block_h = name_cap + NAME_TAG_GAP + len(tag_lines) * tag_pitch - TAG_LINE_GAP
    top = (H - block_h) // 2

    def render(d, dy, fill_name, fill_tag):
        d.text((centre, top + name_cap + dy), name, font=name_font, fill=fill_name, anchor="ms")
        y = top + name_cap + NAME_TAG_GAP + tag_cap + dy
        for line in tag_lines:
            d.text((centre, y), line, font=tag_font, fill=fill_tag, anchor="ms")
            y += tag_pitch

    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    render(ImageDraw.Draw(shadow), 6, (*shade, 175), (*shade, 150))
    canvas = Image.alpha_composite(canvas, shadow.filter(ImageFilter.GaussianBlur(12)))
    render(ImageDraw.Draw(canvas), 0, "white", "white")

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    canvas.convert("RGB").save(out_path, "PNG")          # Play rejects alpha
    try:
        shown = os.path.relpath(out_path, _REPO)
    except ValueError:                      # --out on a different drive than the repo
        shown = out_path
    print(f"OK  {shown} ({W}x{H})  {locale}: {name} / {tagline}")


def main():
    p = argparse.ArgumentParser(description="Compose the Play feature graphic")
    p.add_argument("--locales", default=",".join(COPY))
    p.add_argument("--plate", default=PLATE, help="Background plate (gen_background.py output)")
    p.add_argument("--out", default=os.path.join(_REPO, "screenshots", "final"))
    args = p.parse_args()
    for locale in [l.strip() for l in args.locales.split(",") if l.strip()]:
        build(locale, args.plate, os.path.join(args.out, locale, "play", "feature-graphic.png"))


if __name__ == "__main__":
    main()
