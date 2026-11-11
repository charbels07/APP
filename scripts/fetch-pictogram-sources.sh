#!/usr/bin/env bash
# Downloads the original pictogram libraries used by scripts/build-pictograms.ts.
#
#   npm run fetch:picto                 everything (about 600 MB on disk, 10–20 minutes)
#   npm run fetch:picto -- lucide noto  only the libraries named
#
# Official sources only (each project's own GitHub repository or npm package), at the exact
# versions written in pictograms/libraries.json. Nothing is modified: the folders hold the
# original files with their original names and licence files. They are kept OUTSIDE the app
# (../picto-sources, or the folder named by PICTO_SOURCES) because the app only ships the
# resized copies built from them.
#
# Licence check before adding a library here: docs/PICTOGRAM-LICENSES.md.
set -euo pipefail

DEST="${PICTO_SOURCES:-$(cd "$(dirname "$0")/../.." && pwd)/picto-sources}"
mkdir -p "$DEST"
WANT=("$@")

wanted() {
  [ ${#WANT[@]} -eq 0 ] && return 0
  local w
  for w in "${WANT[@]}"; do [ "$w" = "$1" ] && return 0; done
  return 1
}

# npm_pkg <folder> <package@version>: the published package, unpacked as it is.
npm_pkg() {
  wanted "$1" || return 0
  local dir="$DEST/$1"
  if [ -f "$dir/package.json" ]; then echo "= $1 (already there)"; return 0; fi
  echo "+ $1 ← npm $2"
  mkdir -p "$dir"
  local tgz
  tgz=$(cd "$DEST" && npm pack "$2" --silent | tail -n 1)
  tar -xzf "$DEST/$tgz" -C "$dir" --strip-components=1
  rm -f "$DEST/$tgz"
}

# git_at <folder> <repository> <commit> [paths…]: one commit, only the folders needed.
git_at() {
  wanted "$1" || return 0
  local name=$1 dir="$DEST/$1" url=$2 sha=$3
  shift 3
  if [ -d "$dir/.git" ] && [ "$(git -C "$dir" rev-parse HEAD)" = "$sha" ]; then echo "= $name (already there)"; return 0; fi
  echo "+ $name ← $url @ ${sha:0:8}"
  rm -rf "$dir"
  git clone --quiet --filter=blob:none --no-checkout "$url" "$dir"
  if [ $# -gt 0 ]; then git -C "$dir" sparse-checkout set --no-cone "$@"; fi
  git -C "$dir" checkout --quiet "$sha"
}

# Material Symbols: the repository is several GB, so only the style used by the app is fetched
# (rounded, filled, 24 px), file by file, from the same commit.
material() {
  wanted material || return 0
  local dir="$DEST/material" sha=10ecc14790612ca8fd164e3f4ffe9c16fc50d5b7
  local raw="https://raw.githubusercontent.com/google/material-design-icons/$sha"
  echo "+ material ← google/material-design-icons @ ${sha:0:8}"
  mkdir -p "$dir/svg"
  echo "$sha" > "$dir/COMMIT"
  curl -sSf --retry 3 -o "$dir/LICENSE" "$raw/LICENSE"
  curl -sSf --retry 3 -o "$dir/current_versions.json" "$raw/update/current_versions.json"
  node -e '
    const d = JSON.parse(require("fs").readFileSync(process.argv[1] + "/current_versions.json", "utf8"));
    const names = Object.keys(d).filter((k) => k.startsWith("symbols::")).map((k) => k.split("::")[1]).sort();
    require("fs").writeFileSync(process.argv[1] + "/names.txt", names.join("\n") + "\n");
  ' "$dir"
  # Names listed by Google but without a file in this style are simply skipped.
  (cd "$dir" && xargs -P 12 -I{} sh -c \
    '[ -s "svg/{}.svg" ] || curl -sSf --retry 3 -m 40 -o "svg/{}.svg" "'"$raw"'/symbols/web/{}/materialsymbolsrounded/{}_fill1_24px.svg" 2>/dev/null || rm -f "svg/{}.svg"' \
    < names.txt)
  echo "  $(ls "$dir/svg" | wc -l) of $(wc -l < "$dir/names.txt") symbols"
}

git_at  mulberry    https://github.com/mulberrysymbols/mulberry-symbols fa94a93ca1b5357c0b6e0d9f8a81c426a1dfefdf
npm_pkg openmoji    openmoji@17.0.0
git_at  fluent      https://github.com/microsoft/fluentui-emoji 1ffb34c752ecf5d402f04cfb4b392c77f57c54bc \
        '/assets/**/Color/*.svg' '/assets/**/metadata.json' /LICENSE /README.md
git_at  noto        https://github.com/googlefonts/noto-emoji 99701e07d3d1fe1bdbcdb14964547f0fd592966f \
        '/2D/svg/*' /LICENSE /README.md /AUTHORS /third_party/region-flags/LICENSE
git_at  twemoji     https://github.com/jdecked/twemoji b6b55fef1e8636b540a6d016a4729ca8cdf2e60b \
        '/assets/svg/*' '/LICENSE*' /README.md /package.json
npm_pkg healthicons healthicons@3.1.0
material
npm_pkg phosphor    @phosphor-icons/core@2.1.1
npm_pkg lucide      lucide-static@1.72.0
npm_pkg tabler      @tabler/icons@3.51.0
# Words for the emoji in French, English and Arabic (Unicode CLDR, Unicode License v3).
npm_pkg cldr         cldr-annotations-full@49.0.0
npm_pkg cldr-derived cldr-annotations-derived-full@49.0.0

echo "Sources ready in $DEST — now: npm run build:picto && npm run build:symbols"
