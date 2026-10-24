const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
const nativeDirs = ['android', 'ios'].map(
  (dir) =>
    new RegExp(`^${path.join(__dirname, dir).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')}[\\\\/]`),
);
config.resolver.sourceExts.push('sql');
config.resolver.assetExts.push('wasm');
config.resolver.blockList = nativeDirs;

module.exports = withNativeWind(config, { input: './src/global.css' });
