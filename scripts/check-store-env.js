// Runs on EAS before a store app is built (package.json "eas-build-pre-install"). A tablet app
// built without the server's address would say "not connected"; one without the purchase keys
// could not take a subscription once payment is switched on. Development builds may use the demo.
const profile = process.env.EAS_BUILD_PROFILE || '';
if (profile === 'development') {
  console.log('Development build: the server and purchase keys are optional.');
  process.exit(0);
}
const platform = process.env.EAS_BUILD_PLATFORM || '';
const need = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'];
if (platform === 'ios') need.push('EXPO_PUBLIC_REVENUECAT_IOS_KEY');
if (platform === 'android') need.push('EXPO_PUBLIC_REVENUECAT_ANDROID_KEY');
const missing = need.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`\nMissing: ${missing.join(', ')}.\nAdd them in expo.dev → the project → Environment variables ("${profile}"), then build again.\n`);
  process.exit(1);
}
console.log(`Server address and purchase key found for the ${platform} ${profile} build.`);
