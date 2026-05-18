// One-off generator for the Android notification icon.
//
// Run with: node scripts/generate-notification-icon.mjs
//
// Outputs:
//   assets/notification-icon.png   white-on-transparent app icon silhouette (192x192)

import { Jimp, intToRGBA } from 'jimp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const ICON_SRC = path.join(projectRoot, 'assets', 'icons', 'playstore-icon.png');
const NOTIF_OUT = path.join(projectRoot, 'assets', 'notification-icon.png');
const NOTIF_SIZE = 192;

async function buildNotificationIcon() {
  const icon = await Jimp.read(ICON_SRC);
  icon.contain({ w: NOTIF_SIZE, h: NOTIF_SIZE });

  const { data, width, height } = icon.bitmap;
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

  await icon.write(NOTIF_OUT);
  console.log(`Wrote ${path.relative(projectRoot, NOTIF_OUT)} (${width}x${height})`);
}

await buildNotificationIcon();
