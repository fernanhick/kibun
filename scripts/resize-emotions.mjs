// One-off asset optimizer: the emotion PNGs ship at 512×512 but are only ever
// rendered at 46–154px (check-in grid bubbles, custom-mood swatches). Decoding
// eighteen 512² PNGs on first paint stalls the mood grid for a few seconds.
// Downscale the sources to 256×256 — still 4–5× the largest on-screen size, and
// imperceptible for these soft, low-frequency kawaii faces — to cut decode cost
// and bundle weight ~4×. Re-runnable; safe to delete after the assets are committed.

import { Jimp } from 'jimp';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TARGET = 256;
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'emotions');

const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.png'));

let done = 0;
for (const file of files) {
  const path = join(dir, file);
  const img = await Jimp.read(path);
  if (img.width <= TARGET && img.height <= TARGET) {
    console.log(`· skip ${file} (already ${img.width}×${img.height})`);
    continue;
  }
  // Bilinear keeps the soft edges clean; square sources stay square.
  img.resize({ w: TARGET, h: TARGET });
  await img.write(path);
  done += 1;
  console.log(`✓ ${file} → ${TARGET}×${TARGET}`);
}

console.log(`\nResized ${done}/${files.length} emotion PNGs to ${TARGET}px.`);
