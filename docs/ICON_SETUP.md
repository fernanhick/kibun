# Icon Setup Guide for Kibun

## Overview

Kibun uses platform-specific icons organized in `assets/icons/` with separate folders for Android and Apple devices.

## Directory Structure

```
assets/icons/
├── android/                  # Android-specific icons
│   ├── mipmap-hdpi/         # High density (150 dpi)
│   ├── mipmap-mdpi/         # Medium density (160 dpi)
│   ├── mipmap-xhdpi/        # Extra high density (320 dpi)
│   ├── mipmap-xxhdpi/       # Extra-extra high density (480 dpi)
│   ├── mipmap-xxxhdpi/      # Extra-extra-extra high density (640 dpi)
│   ├── mipmap-anydpi-v26/   # Vector-drawable folder (Android 8.0+)
│   │   ├── ic_launcher.xml           # Main app icon
│   │   └── ic_launcher_round.xml     # Rounded app icon
│   ├── drawable/            # Shared drawables
│   │   └── ic_launcher_background.xml
│   └── playstore-icon.png   # Play Store listing icon (1024x1024)
│
└── apple-devices/           # iOS, macOS, and watchOS icons
    ├── AppIcon.appiconset/  # Main app icons (iOS, macOS, watchOS)
    │   ├── Contents.json    # Manifest defining all icon sizes
    │   ├── icon-ios-*.png   # iOS icons (various sizes)
    │   ├── icon-mac-*.png   # macOS icons (16x16 to 512x512)
    │   └── icon-watchos-*.png # watchOS icons (22x22 to 98x98)
    │
    └── Messages Icon.stickersiconset/ # iMessage sticker icon (optional)
```

## How It Works

### Automatic Icon Copying

When you run `npm install`, the `postinstall` script automatically executes:

```bash
npm run setup:icons
```

This script copies icons from `assets/icons/` to the native build directories:
- **Android**: Copies PNG files to `android/app/src/main/res/mipmap-*` and XML files to `mipmap-anydpi-v26/`
- **Assets**: Copies the playstore icon to `assets/icons/`

### App Configuration

The `app.config.ts` file is configured to reference these platform-specific icons:

**iOS** (in `ios` section):
```typescript
icon: './assets/icons/apple-devices/AppIcon.appiconset/icon-ios-1024x1024.png'
```

**Android** (in `android` section):
```typescript
icon: './assets/icons/android/mipmap-xxxhdpi/ic_launcher.png'
adaptiveIcon: {
  foregroundImage: './assets/icons/android/mipmap-xxxhdpi/ic_launcher_foreground.png',
  backgroundColor: '#4A86FF'
}
```

## Icon Sizes

### Android Icon Densities

| Density   | Scale | PX Size | DPI  |
|-----------|-------|---------|------|
| mdpi      | 1x    | 48×48   | 160  |
| hdpi      | 1.5x  | 72×72   | 240  |
| xhdpi     | 2x    | 96×96   | 320  |
| xxhdpi    | 3x    | 144×144 | 480  |
| xxxhdpi   | 4x    | 192×192 | 640  |

### iOS Icon Sizes

- **App Icon**: 1024×1024 (primary)
- **iPhone**: 20×20 (notifications), 40×40 (spotlight), 60×60 (app)
- **iPad**: 76×76, 83.5×83.5 (app)
- **macOS**: 16×16 to 512×512
- **watchOS**: 22×22 to 98×98

## Manual Icon Setup

If icons need to be updated, follow these steps:

1. **Replace icon files** in the appropriate `assets/icons/android/` or `assets/icons/apple-devices/` folder
2. **Run the setup script** to copy to native directories:
   ```bash
   npm run setup:icons
   ```
3. **For iOS** (EAS build): The icons in `AppIcon.appiconset/` are automatically used during the EAS build process
4. **For Android** (local development): The icons are immediately available in `android/app/src/main/res/`

## Building with EAS

When building with EAS:

```bash
eas build --platform ios
eas build --platform android
```

EAS will:
- Use the icon references from `app.config.ts`
- For iOS: Generate the app bundle with all icon sizes from `AppIcon.appiconset/`
- For Android: Prebuild merges the icons from the native directories

## Tips

- Keep all icon files at the correct sizes to avoid scaling artifacts
- The adaptive icon XML files in `mipmap-anydpi-v26/` define how foreground/background layers combine
- macOS and watchOS icons are optional but recommended for a complete App Store presence
- The playstore icon (1024×1024) is used for Google Play Store listing

## Troubleshooting

**Icons not showing up after build?**
- Run `npm run setup:icons` to ensure icons are copied to native directories
- For iOS, make sure `AppIcon.appiconset/Contents.json` exists and is valid JSON
- For Android, verify files are in `android/app/src/main/res/mipmap-*`

**Build failing with icon errors?**
- Check that all referenced icon files exist and are readable
- Verify PNG files are valid and not corrupted
- Ensure XML files in `mipmap-anydpi-v26/` are properly formatted

**Local Android builds not seeing new icons?**
- Run `npm run setup:icons` after updating icon files
- Clean build: `cd android && ./gradlew clean && cd ..`
- Rebuild: `npm run android`
