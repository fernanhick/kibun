#!/usr/bin/env python3
"""
Backdrops for the store screenshots, rendered on a local ComfyUI (Z-Image Turbo).

Generates text-free, device-free plates that compose.py lays under the headline
and phone with --bg-image. Start the ComfyUI server first; this only talks to
its HTTP API.

    python scripts/aso/gen_background.py --styles bloom-sky,bloom-sunset --seeds 2
    python scripts/aso/gen_background.py --list

Output: screenshots/backgrounds/<style>-<seed>.png at 736x1600 (the 1290x2796
canvas aspect) plus _sheet.png. Files already on disk are skipped, so after a
server hang, restart ComfyUI and re-run the same command to resume.

Never generate text, UI, a phone or the mascot here: the model garbles lettering,
and anything product-like in a store screenshot must come from the real app.
"""

import argparse
import io
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

from PIL import Image

_HERE = os.path.dirname(os.path.abspath(__file__))
_REPO = os.path.abspath(os.path.join(_HERE, "..", ".."))

MODEL = {
    "unet": "z_image_turbo_bf16.safetensors",
    "clip": "qwen_3_4b.safetensors",
    "vae": "ae.safetensors",
}
WIDTH, HEIGHT = 736, 1600            # multiples of 16, ~2.17:1 like the canvas
STEPS, CFG = 8, 1.0
TIMEOUT = 420                        # first image also loads ~19 GB of weights
# "default" = bf16 UNET (~11.5 GB RAM). "fp8_e4m3fn" roughly halves it and renders at the
# same speed on the RX 6750 XT (no native fp8 math on RDNA2) - use it when RAM is tight.
WEIGHT_DTYPE = "default"

# Composition rules bookend every subject, so different styles and seeds still read
# as one family. The palette lives in each style, not here.
FRAME = ("gentle diffused light, dreamy and cute, calm uncluttered centre, "
         "tall vertical wallpaper, high quality, no text")

ROSE = "soft deep rose pink and dusty mauve colour palette"

# Shared bloom subject: branches at the edges keep the middle clear for the phone,
# and the palette clause is what makes each frame of the set its own colour.
BLOOM = ("cherry blossom branches entering from the top corners and edges, a few petals "
         "drifting, soft round bokeh lights, open clear space in the middle")
VIVID = "rich saturated colours, not washed out"

STYLES = {
    # First round (2026-09-11): one rose palette for the whole set
    "bloom": f"{ROSE}, soft focus backdrop of drifting cherry blossom petals and round "
             "bokeh lights, a few petals floating near the top corners, smooth rose gradient",
    "clouds": f"{ROSE}, kawaii dreamy sky of puffy rounded clouds and tiny twinkling "
              "four-point stars, flat pastel illustration",
    "paper": f"{ROSE}, layered paper-cut art, soft rolling paper hills stacked in depth "
             "with gentle shadows, a few tiny paper stars and hearts, minimal",
    "silk": f"{ROSE}, abstract flowing satin fabric waves with a soft sheen and subtle "
            "folds, elegant and minimal",
    # Bloom family, one colour story per frame
    "bloom-sky": f"{BLOOM}, pink blossoms against a clear vivid cerulean blue sky, {VIVID}",
    "bloom-sunset": f"{BLOOM}, pink and white blossoms against a warm coral, tangerine and "
                    f"magenta sunset sky, {VIVID}",
    "bloom-lilac": f"{BLOOM}, pale pink blossoms against a deep lavender and violet twilight "
                   f"sky with warm golden bokeh, {VIVID}",
    "bloom-mint": f"{BLOOM}, pink blossoms against a deep jade and teal green background "
                  f"with soft sunlight, {VIVID}",
    "bloom-golden": f"{BLOOM}, pink blossoms in warm golden hour light against a honey amber "
                    f"and peach sky, {VIVID}",
    # Frames 5-8 of the 8-frame set: hues not already used by sky / sunset / lilac / mint
    "bloom-night": f"{BLOOM}, softly glowing pink blossoms against a deep indigo night sky "
                   f"with tiny twinkling stars, {VIVID}",
    "bloom-sunny": f"{BLOOM}, pink blossoms against a bright sunshine yellow and warm lemon "
                   f"sky, cheerful, {VIVID}",
    "bloom-lagoon": f"{BLOOM}, pink blossoms against a clear turquoise and aqua lagoon-blue "
                    f"background, {VIVID}",
    "bloom-meadow": f"{BLOOM}, pink blossoms against a fresh spring lime and grass green "
                    f"background with soft sunlight, {VIVID}",
}

NEGATIVE = ("text, letters, words, numbers, watermark, logo, signature, person, face, "
            "hands, animal, dog, phone, smartphone, screen, device, frame, border, "
            "clutter, harsh contrast, noise, jpeg artifacts, washed out, monochrome")


def render(url, prompt, seed):
    wf = {
        "1": {"class_type": "UNETLoader",
              "inputs": {"unet_name": MODEL["unet"], "weight_dtype": WEIGHT_DTYPE}},
        "2": {"class_type": "CLIPLoader",
              "inputs": {"clip_name": MODEL["clip"], "type": "stable_diffusion"}},
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": MODEL["vae"]}},
        "4": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["2", 0], "text": prompt}},
        "5": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["2", 0], "text": NEGATIVE}},
        "6": {"class_type": "EmptySD3LatentImage",
              "inputs": {"width": WIDTH, "height": HEIGHT, "batch_size": 1}},
        "7": {"class_type": "KSampler",
              "inputs": {"model": ["1", 0], "positive": ["4", 0], "negative": ["5", 0],
                         "latent_image": ["6", 0], "seed": seed, "steps": STEPS, "cfg": CFG,
                         "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["7", 0], "vae": ["3", 0]}},
        "9": {"class_type": "PreviewImage", "inputs": {"images": ["8", 0]}},
    }
    body = json.dumps({"prompt": wf, "client_id": str(uuid.uuid4())}).encode()
    req = urllib.request.Request(f"{url}/prompt", data=body,
                                 headers={"Content-Type": "application/json"})
    try:
        pid = json.load(urllib.request.urlopen(req, timeout=60))["prompt_id"]
    except urllib.error.URLError as e:
        raise SystemExit(f"No ComfyUI answering at {url} ({e}). Start the server, then re-run.")

    deadline = time.time() + TIMEOUT
    while True:
        hist = json.load(urllib.request.urlopen(f"{url}/history/{pid}", timeout=30))
        if pid in hist:
            break
        if time.time() > deadline:
            raise SystemExit(f"Timed out after {TIMEOUT}s. The server has probably hung: "
                             "restart ComfyUI and re-run; finished plates are kept.")
        time.sleep(2)

    entry = hist[pid]
    if entry.get("status", {}).get("status_str") != "success":
        msgs = [str(m)[:300] for m in entry.get("status", {}).get("messages", [])][-3:]
        raise SystemExit("ComfyUI run failed:\n  " + "\n  ".join(msgs))
    meta = [i for o in entry.get("outputs", {}).values() for i in o.get("images", [])][0]
    q = urllib.parse.urlencode({"filename": meta["filename"],
                                "subfolder": meta.get("subfolder", ""),
                                "type": meta.get("type", "temp")})
    return urllib.request.urlopen(f"{url}/view?{q}", timeout=120).read()


def contact_sheet(out_dir):
    plates = sorted(f for f in os.listdir(out_dir) if f.endswith(".png") and not f.startswith("_"))
    if not plates:
        return
    tw, th, gap = 230, 500, 12
    sheet = Image.new("RGB", (len(plates) * (tw + gap) + gap, th + 2 * gap), "#2B1F24")
    for i, name in enumerate(plates):
        im = Image.open(os.path.join(out_dir, name)).resize((tw, th), Image.LANCZOS)
        sheet.paste(im, (gap + i * (tw + gap), gap))
    sheet.save(os.path.join(out_dir, "_sheet.png"))
    print(f"sheet -> {os.path.join(out_dir, '_sheet.png')}  ({', '.join(plates)})")


def main():
    global WEIGHT_DTYPE
    p = argparse.ArgumentParser(description="Generate screenshot backdrops on a local ComfyUI")
    p.add_argument("--styles", default="bloom,clouds,paper,silk", help="Comma-separated style names (see --list)")
    p.add_argument("--list", action="store_true", help="Print the style names and exit")
    p.add_argument("--seeds", type=int, default=1, help="Plates per style (default 1)")
    p.add_argument("--seed", type=int, default=52000, help="Base seed")
    p.add_argument("--url", default="http://127.0.0.1:8188", help="ComfyUI server")
    p.add_argument("--out", default=os.path.join(_REPO, "screenshots", "backgrounds"))
    p.add_argument("--weight-dtype", default=WEIGHT_DTYPE, choices=["default", "fp8_e4m3fn", "fp8_e4m3fn_fast"],
                   help="UNET weight dtype; fp8 halves RAM use (default: bf16)")
    args = p.parse_args()
    WEIGHT_DTYPE = args.weight_dtype

    if args.list:
        print("\n".join(STYLES))
        return

    styles = [s.strip() for s in args.styles.split(",") if s.strip()]
    unknown = [s for s in styles if s not in STYLES]
    if unknown:
        raise SystemExit(f"Unknown style(s): {', '.join(unknown)}. Known: {', '.join(STYLES)}")
    os.makedirs(args.out, exist_ok=True)

    for style in styles:
        for n in range(args.seeds):
            seed = args.seed + n * 977
            path = os.path.join(args.out, f"{style}-{seed}.png")
            if os.path.exists(path):
                print(f"skip {os.path.basename(path)} (already on disk)")
                continue
            t0 = time.time()
            print(f"render {style} seed {seed} ...", flush=True)
            data = render(args.url.rstrip("/"), f"{FRAME}. {STYLES[style]}. {FRAME}.", seed)
            Image.open(io.BytesIO(data)).convert("RGB").save(path)
            print(f"  {time.time() - t0:5.1f}s -> {path}", flush=True)

    contact_sheet(args.out)


if __name__ == "__main__":
    main()
