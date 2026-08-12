// Generator for the Android notification icon.
//
// Run with: node scripts/generate-notification-icon.mjs
//
// Source:
//   assets/notification-icon-master.png   512x512 white-on-transparent silhouette of the
//                                         mascot's head (traced from the mascot artwork —
//                                         see assets/webp animation/mascot-happy.webp)
//
// Outputs:
//   assets/notification-icon.png                              192x192 (consumed by expo-notifications)
//   android/app/src/main/res/drawable-*/notification_icon.png  24/36/48/72/96 (prebuilt res)
//
// Android renders the small notification icon as a mask: every non-transparent pixel is
// painted with the accent colour. The artwork must therefore be a flat white silhouette on
// a transparent background — an opaque square (the previous output) shows up as a plain box.

import { Jimp } from 'jimp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const MASTER_SRC = path.join(projectRoot, 'assets', 'notification-icon-master.png');
const NOTIF_OUT = path.join(projectRoot, 'assets', 'notification-icon.png');
const NOTIF_SIZE = 192;

const ANDROID_RES = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');
const DENSITIES = [
  ['drawable-mdpi', 24],
  ['drawable-hdpi', 36],
  ['drawable-xhdpi', 48],
  ['drawable-xxhdpi', 72],
  ['drawable-xxxhdpi', 96],
];

async function writeResized(master, size, outPath) {
  const icon = master.clone().resize({ w: size, h: size });

  // Force pure white; keep the alpha channel as the silhouette mask.
  const { data } = icon.bitmap;
  for (let idx = 0; idx < data.length; idx += 4) {
    data[idx] = 255;
    data[idx + 1] = 255;
    data[idx + 2] = 255;
  }

  await icon.write(outPath);
  console.log(`Wrote ${path.relative(projectRoot, outPath)} (${size}x${size})`);
}

const master = await Jimp.read(MASTER_SRC);

await writeResized(master, NOTIF_SIZE, NOTIF_OUT);

for (const [dir, size] of DENSITIES) {
  const outDir = path.join(ANDROID_RES, dir);
  try {
    await fs.access(outDir);
  } catch {
    console.log(`Skipping ${dir} (not prebuilt)`);
    continue;
  }
  await writeResized(master, size, path.join(outDir, 'notification_icon.png'));
}
