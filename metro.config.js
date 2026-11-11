// Learn more: https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Offline pictogram library: pictogram packs and their JSON index (see scripts/build-pictograms.ts).
config.resolver.assetExts.push('pack', 'pidx');

module.exports = config;
