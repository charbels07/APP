// Learn more: https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Offline pictogram library: pictogram packs and their JSON index (see scripts/build-pictograms.ts).
config.resolver.assetExts.push('pack', 'pidx');
// Parallel work copies of the repository (git worktrees) are not part of the app.
config.resolver.blockList = [/\.claude[\/\\]worktrees[\/\\].*/];

module.exports = config;
