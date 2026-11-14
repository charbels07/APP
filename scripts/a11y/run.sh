#!/usr/bin/env bash
# Accessibility check of the web version: builds the demo, serves it, scans the main screens at
# several sizes and in Arabic, then tries the keyboard. Usage: npm run test:a11y
# Needs python3 and Playwright (with its Chromium) installed on the machine.
set -uo pipefail
cd "$(dirname "$0")/../.."
OUT=$(mktemp -d)
PORT=${A11Y_PORT:-8771}
export A11Y_OUT="$OUT/results"
EXPO_NO_DOTENV=1 EXPO_PUBLIC_APP_MODE=demo EXPO_OFFLINE=1 npx expo export -p web --output-dir "$OUT/site" >/dev/null 2>&1 || { echo "the web build failed"; exit 1; }
# "exec": the process we stop at the end is the server itself, not a shell around it.
(cd "$OUT/site" && exec python3 -m http.server "$PORT" >/dev/null 2>&1) &
SERVER=$!
trap 'kill $SERVER 2>/dev/null; rm -rf "$OUT"' EXIT
until curl -s -o /dev/null "http://localhost:$PORT/"; do sleep 1; done
# The page must really be the app (not an older server left on this port).
curl -s "http://localhost:$PORT/" | grep -q "_expo/static/js" || { echo "port $PORT does not serve the build: is something else using it?"; exit 1; }
FAIL=0
for cfg in "en-GB 1180 900 computer" "en-GB 390 800 phone" "en-GB 320 640 narrow" "en-GB 590 450 zoom-200" "ar-LB 1180 900 arabic" "ar-LB 390 800 arabic-phone"; do
  set -- $cfg
  out=$(node scripts/a11y/scan.js "$PORT" "$1" "$2" "$3" "$4" 2>&1)
  bad=$(echo "$out" | grep " · " | grep -v "no violation")
  echo "$4 ($2x$3): $(echo "$out" | grep -c ' · ') screens, $(echo "$out" | grep -c 'no violation') without any violation"
  if [ -n "$bad" ]; then echo "$bad"; FAIL=1; fi
done
echo "--- the professional side (verification, workspace)"
for size in "1180 900" "390 800"; do
  set -- $size
  out=$(node scripts/a11y/scan-pro.js "$PORT" "$1" "$2" 2>&1); [ $? -ne 0 ] && FAIL=1
  echo "professional side ($1x$2): $(echo "$out" | grep -c ' · ') screens, $(echo "$out" | grep -c 'no violation') without any violation"
  echo "$out" | grep " · " | grep -v "no violation"
done
echo "--- keyboard only"
node scripts/a11y/keys.js "$PORT" || FAIL=1
exit $FAIL
