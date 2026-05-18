import { ExpoConfig, ConfigContext } from 'expo/config';

const linkingConfig = {
  prefixes: ['kibun://', 'https://kibun.app'],
  config: {
    screens: {
      '(tabs)': '(tabs)',
      'auth/callback': 'auth/callback',
      '*': '*',
    },
  },
};

export default ({ config }: ConfigContext) => ({
  ...config,
  name: 'Kibun',
  slug: 'kibun',
  version: '1.0.0',
  scheme: 'kibun',
  // Orientation unlocked here; phones are locked to portrait at runtime via
  // @lib/orientation:applyOrientationPolicy so tablets can rotate freely.
  orientation: 'default',
  // Main icon used for splash screen and fallback. Platform-specific icons are
  // configured in ios/android sections and copied to native directories.
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    backgroundColor: '#4A86FF',
  },
  assetBundlePatterns: ['**/*'],
  linking: linkingConfig as any,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.kibun.app',
    buildNumber: '1',
    // Use the high-quality 1024x1024 icon; platform-specific sizes are in
    // assets/icons/apple-devices/AppIcon.appiconset and are applied during the
    // EAS/Xcode build process.
    icon: './assets/icons/apple-devices/AppIcon.appiconset/icon-ios-1024x1024.png',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    // Use the highest density icon (xxxhdpi) as fallback
    icon: './assets/icons/android/mipmap-xxxhdpi/ic_launcher.png',
    // Adaptive icon for Android 8.0+. The XML files define how foreground and
    // background layers are combined. Icons are in mipmap-anydpi-v26/*.xml
    adaptiveIcon: {
      foregroundImage: './assets/icons/android/mipmap-xxxhdpi/ic_launcher_foreground.png',
      backgroundColor: '#4A86FF',
    },
    package: 'com.kibun.app',
    resizeableActivity: true,
    // SYSTEM_ALERT_WINDOW leaks in from RN's debug manifest; AD_ID is auto-injected
    // by Play Services. Neither is used by Kibun — block both so Play doesn't gate
    // the listing on a sensitive-permissions declaration.
    blockedPermissions: [
      'android.permission.SYSTEM_ALERT_WINDOW',
      'com.google.android.gms.permission.AD_ID',
    ],
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/favicon.png',
  },
  extra: {
    eas: {
      projectId: '17e23791-25d6-473c-a2df-62698a5763b6',
    },
  },
  plugins: [
    'expo-asset',
    'expo-image',
    'expo-font',
    'expo-localization',
    'expo-router',
    'expo-secure-store',
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#4A86FF',
      },
    ],
    'expo-screen-orientation',
    'expo-sharing',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#4A86FF',
        image: './assets/icon.png',
        imageWidth: 400,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
});
