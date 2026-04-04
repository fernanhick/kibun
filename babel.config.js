module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@components': './src/components',
            '@store': './src/store',
            '@models': './src/types',
            '@constants': './src/constants',
            '@hooks': './src/hooks',
            '@lib': './src/lib',
          },
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        },
      ],
      'react-native-reanimated/plugin', // MUST BE LAST — Reanimated babel transform
    ],
  };
};
