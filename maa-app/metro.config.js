const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure that we can resolve .ts and .tsx files, and bundle .csv files
config.resolver.sourceExts = [...new Set([...config.resolver.sourceExts, 'ts', 'tsx'])];
config.resolver.assetExts.push('csv');

module.exports = config;
