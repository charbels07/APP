// Before building the web version to put online: the address and public key of the real server
// must be known. Without them the build would quietly contain the demo server instead.
const fs = require('node:fs');
const need = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'];
const file = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
const missing = need.filter((k) => !process.env[k] && !new RegExp(`^\\s*${k}\\s*=\\s*\\S`, 'm').test(file));
if (missing.length) {
  console.error(`\nMissing: ${missing.join(', ')}.\nAdd them as build variables on the hosting service (or in .env on a computer), then build again.\n`);
  process.exit(1);
}
console.log('Server address and public key found: building the web version for the real server.');
