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
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash-preview2.png',
    resizeMode: 'cover',
    backgroundColor: '#6C63FF',
  },
  assetBundlePatterns: ['**/*'],
  linking: linkingConfig as any,
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.kibun.app',
    buildNumber: '1',
    icon: './assets/icon.png',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    icon: './assets/icon.png',
    package: 'com.kibun.app',
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
    'expo-font',
    'expo-router',
    'expo-secure-store',
    'expo-notifications',
    'react-native-purchases',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-preview2.png',
        resizeMode: 'cover',
        backgroundColor: '#6C63FF',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
});
