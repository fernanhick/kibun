// One-off generator for the Android notification icon and (optionally) a flattened iOS app icon.
//
// Run with: node scripts/generate-notification-icon.mjs
//
// Outputs:
//   assets/notification-icon.png   white-on-transparent paw silhouette (192x192)
//   assets/icon.png                re-flattened against brand blue ONLY if it currently has alpha

import { Jimp, intToRGBA } from 'jimp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const PAW_SRC = path.join(projectRoot, 'assets', 'paw.png');
const NOTIF_OUT = path.join(projectRoot, 'assets', 'notification-icon.png');
const ICON_PATH = path.join(projectRoot, 'assets', 'icon.png');
const NOTIF_SIZE = 192;
const BRAND_BG = { r: 0x4a, g: 0x86, b: 0xff, a: 255 };

async function buildNotificationIcon() {
  const paw = await Jimp.read(PAW_SRC);
  paw.contain({ w: NOTIF_SIZE, h: NOTIF_SIZE });

  const { data, width, height } = paw.bitmap;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (data[idx + 3] > 0) {
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
      }
    }
  }

  await paw.write(NOTIF_OUT);
  console.log(`Wrote ${path.relative(projectRoot, NOTIF_OUT)} (${width}x${height})`);
}

async function flattenIconIfAlpha() {
  const icon = await Jimp.read(ICON_PATH);
  const { data, width, height } = icon.bitmap;

  let hasTransparency = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) {
      hasTransparency = true;
      break;
    }
  }

  if (!hasTransparency) {
    console.log(`Skipped ${path.relative(projectRoot, ICON_PATH)} (no alpha channel detected)`);
    return;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const a = data[idx + 3] / 255;
      data[idx] = Math.round(data[idx] * a + BRAND_BG.r * (1 - a));
      data[idx + 1] = Math.round(data[idx + 1] * a + BRAND_BG.g * (1 - a));
      data[idx + 2] = Math.round(data[idx + 2] * a + BRAND_BG.b * (1 - a));
      data[idx + 3] = 255;
    }
  }

  await icon.write(ICON_PATH);
  console.log(`Flattened ${path.relative(projectRoot, ICON_PATH)} against #4A86FF (had alpha)`);
}

await buildNotificationIcon();
await flattenIconIfAlpha();
