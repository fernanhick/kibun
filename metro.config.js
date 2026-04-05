// Metro configuration for kibun.
// Required for ONNX Runtime: registers .onnx as a bundleable asset extension
// so the model file in assets/models/ is included in the app bundle.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow Metro to bundle .onnx model files as assets
config.resolver.assetExts.push('onnx');

module.exports = config;
