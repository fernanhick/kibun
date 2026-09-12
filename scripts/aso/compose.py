#!/usr/bin/env python3
"""
App Store / Google Play Screenshot Composer
Composites headline text, the app screenshot (in a device frame or on a card)
and a background into a store-ready image.

Targets (--target):
  ios   1290×2796  iPhone 6.9" slot, device frame              (default)
  play  1080×1920  Google Play phone, 9:16, no device frame     (Play rejects >2:1
                   images and advises against device imagery; headline kept <20%)
  ipad  2064×2752  iPad 13" slot, no device frame — use a tablet capture
"""

import argparse
import os
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps, ImageStat

# ── Layouts ─────────────────────────────────────────────────────────
# ios is the original composer's geometry, unchanged. play and ipad put the
# screenshot on a rounded card instead of the phone frame.
LAYOUTS = {
    "ios": dict(
        w=1290, h=2796, frame=True,
        device_w=1030, bezel=15, screen_y=720, corner=62,
        text_top=200, verb_max=256, verb_min=150, desc=124, verb_desc_gap=20, desc_line_gap=24,
        text_band=(150, 700), scrim_hold=700, scrim_end=1150,
    ),
    "play": dict(
        w=1080, h=1920, frame=False,
        screen_w=830, screen_y=450, corner=48,
        text_top=92, verb_max=156, verb_min=100, desc=76, verb_desc_gap=14, desc_line_gap=14,
        text_band=(70, 400), scrim_hold=420, scrim_end=760,
    ),
    "ipad": dict(
        w=2064, h=2752, frame=False,
        screen_w=1560, screen_y=760, corner=64,
        text_top=210, verb_max=270, verb_min=170, desc=132, verb_desc_gap=22, desc_line_gap=26,
        text_band=(160, 700), scrim_hold=720, scrim_end=1180,
    ),
}
TEXT_W_FRACTION = 0.92
HEADLINE_CLEARANCE = 36              # min px between the headline and the screen/card top
DESC_MIN_SCALE = 0.7                 # a wrapped descriptor may shrink to 70% of its size

# ── Background image treatment (only used with --bg-image) ──────────
DEFAULT_TINT = 0.85                  # 0 = generated colours as-is, 1 = fully brand-mapped
                                     # (0.65 left pastel plates reading dusty mauve, not rose)
TEXT_BAND_MAX_L = 140                # shade the band until its mean luminance is under this
SCRIM_MIN, SCRIM_MAX = 0.12, 0.60    # fraction the headline band is darkened by
SHADE_DARKEN = 0.35                  # headline shadow colour = band's own average × this
PLATE_SATURATION = 1.12              # colour lift when --tint 0 keeps the plate's own colours
TEXT_SHADOW_BLUR = 14
TEXT_SHADOW_OFFSET = 6

# Kibun fork of the aso-appstore-screenshots composer.
# Changes from the upstream skill version:
#   1. Font resolution works on Windows and defaults to Fredoka Bold — the app's
#      actual display font — instead of the macOS-only SF Pro Display Black path.
#      (Typography inconsistency across frames was a finding in the growth audit;
#      using the real brand font fixes it at the source.)
#   2. --font and --frame CLI overrides.
#   3. device_frame.png lives beside this script rather than in an assets/ subdir.
#   4. --status-bar paints the capture's status bar out (clock, signal, battery),
#      so store frames show the app, not a device state. The band is filled from
#      the first row below it, so the app's layout and spacing do not move.
#   5. --bg-image lays a generated backdrop (see gen_background.py) under the
#      headline and phone. --tint pulls it toward --bg (1 = one-colour set,
#      0 = keep the plate's own colours); the headline band is darkened by
#      multiplication, which keeps its hues, until white text holds.
#   6. --target play / ipad: Google Play and iPad 13" sizes, screenshot on a card.
_HERE = os.path.dirname(os.path.abspath(__file__))
_REPO = os.path.abspath(os.path.join(_HERE, "..", ".."))

FONT_CANDIDATES = [
    # Brand font, shipped with the app
    os.path.join(_REPO, "node_modules", "@expo-google-fonts", "fredoka",
                 "700Bold", "Fredoka_700Bold.ttf"),
    os.path.join(_REPO, "node_modules", "@expo-google-fonts", "fredoka",
                 "600SemiBold", "Fredoka_600SemiBold.ttf"),
    # Heavy sans fallbacks
    "C:/Windows/Fonts/seguibl.ttf",     # Segoe UI Black
    "C:/Windows/Fonts/arialbd.ttf",     # Arial Bold
    "/Library/Fonts/SF-Pro-Display-Black.otf",
    "/System/Library/Fonts/SFNS.ttf",
]


def _resolve_font():
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            return path
    raise SystemExit(
        "No usable font found. Pass one explicitly with --font <path-to-ttf>.\n"
        "Tried:\n  " + "\n  ".join(FONT_CANDIDATES)
    )


FONT_PATH = _resolve_font()
FRAME_PATH = os.path.join(_HERE, "device_frame.png")


def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def word_wrap(draw, text, font, max_w):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        test = f"{cur} {w}".strip()
        if draw.textlength(test, font=font) <= max_w:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def fit_font(text, max_w, size_max, size_min):
    """Return the largest font size where text fits within max_w."""
    dummy = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    for size in range(size_max, size_min - 1, -4):
        font = ImageFont.truetype(FONT_PATH, size)
        bbox = dummy.textbbox((0, 0), text, font=font)
        if (bbox[2] - bbox[0]) <= max_w:
            return font
    return ImageFont.truetype(FONT_PATH, size_min)


def draw_centered(draw, canvas_w, y, text, font, line_gap, max_w=None, fill="white"):
    """Draw centred, wrapped all-caps lines on a fixed baseline pitch.

    Spacing each line by its own bounding box made wrapped lines collide whenever one line
    carried accented capitals (Á, É, Ñ, Ü) and the next did not. Every line now gets the
    same pitch: headroom for accents + cap height + line_gap, drawn on its baseline.
    """
    lines = word_wrap(draw, text, font, max_w) if max_w else [text]
    cap_top = draw.textbbox((0, 0), "H", font=font, anchor="ls")[1]            # < 0
    accent_top = draw.textbbox((0, 0), "ÁÉÍÓÚÄÖÜÑ", font=font, anchor="ls")[1]  # < cap_top
    cap_h = -cap_top
    headroom = max(0, cap_top - accent_top)
    pitch = headroom + cap_h + line_gap
    for i, line in enumerate(lines):
        baseline = y + headroom + cap_h + i * pitch
        draw.text((canvas_w // 2, baseline), line, fill=fill, font=font, anchor="ms")
    return y + len(lines) * pitch


def strip_status_bar(shot, height):
    """Replace the top `height` px with the row just below, stretched upward."""
    if height <= 0:
        return shot
    row = shot.crop((0, height, shot.width, height + 1))
    shot.paste(row.resize((shot.width, height), Image.NEAREST), (0, 0))
    return shot


def brand_background(path, bg, tint, L):
    """Cover-fit a generated backdrop to the canvas and shade it for the headline.

    tint > 0 remaps the luminance so the average tone lands on `bg` (texture and
    light survive, colour becomes the brand's). tint 0 keeps the plate's colours.
    Returns the canvas and the shade colour used, for the headline's shadow.
    """
    W, H = L["w"], L["h"]
    src = Image.open(path).convert("RGB")
    scale = max(W / src.width, H / src.height)
    src = src.resize((round(src.width * scale), round(src.height * scale)), Image.LANCZOS)
    left, top = (src.width - W) // 2, (src.height - H) // 2
    out = src.crop((left, top, left + W, top + H))

    if tint > 0:
        lum = ImageOps.autocontrast(out.convert("L"), cutoff=1)
        mid = int(min(max(ImageStat.Stat(lum).mean[0], 40), 215))
        dark = tuple(int(c * 0.55) for c in bg)
        light = tuple(int(c + (255 - c) * 0.45) for c in bg)
        mapped = ImageOps.colorize(lum, black=dark, white=light, mid=bg,
                                   blackpoint=0, whitepoint=255, midpoint=mid)
        out = Image.blend(out, mapped, tint)
    else:
        # Keeping the plate's colours: lift them slightly so they survive the shade.
        out = ImageEnhance.Color(out).enhance(PLATE_SATURATION)

    # Darken the headline band by multiplying, not by compositing a flat shade: a
    # flat shade pulls every pixel toward one colour and turned blossom-and-sky
    # bands muddy grey-mauve. Multiplying keeps each pixel's own hue. Strength is
    # just enough to bring the band's mean luminance under TEXT_BAND_MAX_L.
    band = out.crop((0, L["text_band"][0], W, L["text_band"][1]))
    band_l = ImageStat.Stat(band.convert("L")).mean[0]
    alpha = min(max(1 - TEXT_BAND_MAX_L / max(band_l, 1), SCRIM_MIN), SCRIM_MAX)
    shade = tuple(int(c * SHADE_DARKEN) for c in ImageStat.Stat(band).mean)

    hold, end = L["scrim_hold"], L["scrim_end"]
    factor = Image.new("L", (1, H))
    for y in range(H):
        if y <= hold:
            a = alpha
        elif y < end:
            s = (y - hold) / (end - hold)
            a = alpha * (1 - s * s * (3 - 2 * s))
        else:
            a = 0.0
        factor.putpixel((0, y), int(255 * (1 - a)))
    factor = factor.resize((W, H)).convert("RGB")
    out = ImageChops.multiply(out, factor)
    return out.convert("RGBA"), shade


def compose(bg_hex, verb, desc, screenshot_path, output_path,
            bg_image=None, tint=DEFAULT_TINT, status_bar=0, target="ios"):
    L = LAYOUTS[target]
    W, H = L["w"], L["h"]
    bg = hex_to_rgb(bg_hex)
    max_text_w = int(W * TEXT_W_FRACTION)

    # ── 1. Canvas ───────────────────────────────────────────────────
    if bg_image:
        canvas, shade = brand_background(bg_image, bg, tint, L)
    else:
        canvas = Image.new("RGBA", (W, H), (*bg, 255))
        shade = tuple(int(c * SHADE_DARKEN) for c in bg)
    draw = ImageDraw.Draw(canvas)

    # ── 2. Headline ─────────────────────────────────────────────────
    verb_font = fit_font(verb.upper(), max_text_w, L["verb_max"], L["verb_min"])
    text_top = L["text_top"]

    def headline(d, y0, fill, dfont):
        y = draw_centered(d, W, y0, verb.upper(), verb_font, L["desc_line_gap"], fill=fill)
        y += L["verb_desc_gap"]
        # draw_centered returns the next line's top; the text itself ends one gap earlier
        return draw_centered(d, W, y, desc.upper(), dfont, L["desc_line_gap"], max_w=max_text_w, fill=fill) - L["desc_line_gap"]

    # Longer (usually translated) descriptors wrap to two lines on the tall iPhone canvas.
    # Shrink the descriptor until the headline clears the screen top, rather than letting
    # the second line slide under the device frame.
    dummy = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    desc_size = L["desc"]
    while True:
        desc_font = ImageFont.truetype(FONT_PATH, desc_size)
        if (headline(dummy, text_top, "white", desc_font) <= L["screen_y"] - HEADLINE_CLEARANCE
                or desc_size <= int(L["desc"] * DESC_MIN_SCALE)):
            break
        desc_size -= 4

    # Soft shadow under the headline — only needed over a textured backdrop
    if bg_image:
        shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        headline(ImageDraw.Draw(shadow), text_top + TEXT_SHADOW_OFFSET, (*shade, 170), desc_font)
        canvas = Image.alpha_composite(canvas, shadow.filter(ImageFilter.GaussianBlur(TEXT_SHADOW_BLUR)))
        draw = ImageDraw.Draw(canvas)
    text_bottom = headline(draw, text_top, "white", desc_font)
    if text_bottom > L["screen_y"]:
        print(f"WARN headline ends at y={text_bottom}, below the screen top ({L['screen_y']})")

    # ── 3. Screenshot ───────────────────────────────────────────────
    shot = strip_status_bar(Image.open(screenshot_path).convert("RGBA"), status_bar)

    if L["frame"]:
        device_w, bezel = L["device_w"], L["bezel"]
        screen_w = device_w - 2 * bezel
        device_x = (W - device_w) // 2
        screen_x, screen_y = device_x + bezel, L["screen_y"] + bezel
    else:
        screen_w = L["screen_w"]
        screen_x, screen_y = (W - screen_w) // 2, L["screen_y"]

    sc_h = int(shot.height * screen_w / shot.width)
    shot = shot.resize((screen_w, sc_h), Image.LANCZOS)
    screen_h = H - screen_y + 500            # runs off the bottom edge
    rect = [screen_x, screen_y, screen_x + screen_w, screen_y + screen_h]

    if not L["frame"]:
        # Card shadow in the backdrop's own darkened hue, so it never reads grey
        card_shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        ImageDraw.Draw(card_shadow).rounded_rectangle(
            [rect[0], rect[1] + 18, rect[2], rect[3]], radius=L["corner"], fill=(*shade, 150))
        canvas = Image.alpha_composite(canvas, card_shadow.filter(ImageFilter.GaussianBlur(34)))

    scr_mask = Image.new("L", canvas.size, 0)
    ImageDraw.Draw(scr_mask).rounded_rectangle(rect, radius=L["corner"], fill=255)
    scr_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(scr_layer).rounded_rectangle(rect, radius=L["corner"], fill=(0, 0, 0, 255))
    scr_layer.paste(shot, (screen_x, screen_y))
    scr_layer.putalpha(scr_mask)
    canvas = Image.alpha_composite(canvas, scr_layer)

    # ── 4. Device frame (ios only) ──────────────────────────────────
    if L["frame"]:
        frame_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        frame_layer.paste(Image.open(FRAME_PATH).convert("RGBA"), (device_x, L["screen_y"]))
        canvas = Image.alpha_composite(canvas, frame_layer)

    # ── 5. Save ─────────────────────────────────────────────────────
    canvas.convert("RGB").save(output_path, "PNG")
    # Plain ASCII — the Windows console defaults to cp1252 and cannot encode
    # box-drawing/check glyphs, which would raise UnicodeEncodeError after the
    # image has already been written successfully.
    print(f"OK  {output_path} ({W}x{H}, {target})  font={os.path.basename(FONT_PATH)}")


def main():
    p = argparse.ArgumentParser(description="Compose App Store / Google Play screenshot")
    p.add_argument("--bg", required=True, help="Background hex colour (#E31837); with --bg-image, the colour --tint pulls toward")
    p.add_argument("--verb", required=True, help="Action verb (TRACK)")
    p.add_argument("--desc", required=True, help="Benefit descriptor (TRADING CARD PRICES)")
    p.add_argument("--screenshot", required=True, help="App capture path")
    p.add_argument("--output", required=True, help="Output file path")
    p.add_argument("--target", choices=sorted(LAYOUTS), default="ios", help="ios (1290x2796, framed), play (1080x1920), ipad (2064x2752)")
    p.add_argument("--font", help="Override font path (.ttf/.otf)")
    p.add_argument("--frame", help="Override device frame PNG path (ios target)")
    p.add_argument("--bg-image", help="Backdrop image to use instead of a flat colour (gen_background.py output)")
    p.add_argument("--tint", type=float, default=DEFAULT_TINT, help=f"How far --bg-image is pulled toward --bg, 0-1 (default {DEFAULT_TINT}; 0 keeps the plate's own colours)")
    p.add_argument("--status-bar", type=int, default=0, help="Height in capture px of the status bar to paint out (Kibun Android phone captures: 62)")
    args = p.parse_args()

    global FONT_PATH, FRAME_PATH
    if args.font:
        FONT_PATH = args.font
    if args.frame:
        FRAME_PATH = args.frame

    compose(args.bg, args.verb, args.desc, args.screenshot, args.output,
            bg_image=args.bg_image, tint=args.tint, status_bar=args.status_bar, target=args.target)


if __name__ == "__main__":
    main()
