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
    icon: './assets/icon.png',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    icon: './assets/icon.png',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#4A86FF',
    },
    package: 'com.kibun.app',
    resizeableActivity: true,
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
    ['expo-splash-screen', { backgroundColor: '#4A86FF' }],
  ],
  experiments: {
    typedRoutes: true,
  },
});
