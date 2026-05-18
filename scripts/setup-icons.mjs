#!/usr/bin/env node
import { copyFileSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = join(__dirname, '..');

// Define source and destination mappings
const mappings = [
  {
    src: 'assets/icons/android/drawable',
    dest: 'android/app/src/main/res/drawable',
    filter: (f) => f.endsWith('.xml'),
  },
  {
    src: 'assets/icons/android/mipmap-anydpi-v26',
    dest: 'android/app/src/main/res/mipmap-anydpi-v26',
    filter: (f) => f.endsWith('.xml'),
  },
  {
    src: 'assets/icons/android/mipmap-hdpi',
    dest: 'android/app/src/main/res/mipmap-hdpi',
    filter: (f) => f.endsWith('.png'),
  },
  {
    src: 'assets/icons/android/mipmap-mdpi',
    dest: 'android/app/src/main/res/mipmap-mdpi',
    filter: (f) => f.endsWith('.png'),
  },
  {
    src: 'assets/icons/android/mipmap-xhdpi',
    dest: 'android/app/src/main/res/mipmap-xhdpi',
    filter: (f) => f.endsWith('.png'),
  },
  {
    src: 'assets/icons/android/mipmap-xxhdpi',
    dest: 'android/app/src/main/res/mipmap-xxhdpi',
    filter: (f) => f.endsWith('.png'),
  },
  {
    src: 'assets/icons/android/mipmap-xxxhdpi',
    dest: 'android/app/src/main/res/mipmap-xxxhdpi',
    filter: (f) => f.endsWith('.png'),
  },
];

// Copy playstore icon to assets
mappings.push({
  src: 'assets/icons/android',
  dest: 'assets/icons',
  filter: (f) => f === 'playstore-icon.png',
});

const run = async () => {
  console.log('🎨 Setting up platform-specific icons...\n');

  try {
    mappings.forEach(({ src, dest, filter }) => {
      const srcPath = join(projectRoot, src);
      const destPath = join(projectRoot, dest);

      mkdirSync(destPath, { recursive: true });

      const files = readdirSync(srcPath).filter(filter);

      files.forEach((file) => {
        const srcFile = join(srcPath, file);
        const destFile = join(destPath, file);
        copyFileSync(srcFile, destFile);
        console.log(`✓ Copied: ${file} → ${dest}`);
      });
    });

    console.log('\n✅ Icons setup complete!');
  } catch (error) {
    console.error('✗ Icon setup failed:', error.message);
    process.exit(1);
  }
};

run();
