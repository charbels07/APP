#!/usr/bin/env bash
# Weekly encrypted copy of the database, kept away from Supabase (docs/runbooks/BACKUP-AND-RESTORE.md).
#
# What it does:
#   1. pg_dump of the whole database (custom format, compressed),
#   2. encrypted on the fly to a PUBLIC key (age or gpg): this machine can make a copy but
#      cannot read one; the private key is kept offline by two people,
#   3. sent with rclone to a storage place of another provider,
#   4. copies older than BACKUP_KEEP_DAYS are deleted from that place (30 to 90 days).
# Nothing unencrypted is written to disk.
#
# Settings (environment variables, never written in this file or committed):
#   DATABASE_URL           connection string of the database (Supabase → Project Settings →
#                          Database → Connection string). Holds a password: keep it in your
#                          password manager and give it to this script for the run only.
#   BACKUP_AGE_RECIPIENT   the age public key ("age1…")             } one of the two
#   BACKUP_GPG_RECIPIENT   the gpg key id or e-mail of the public key }
#   BACKUP_RCLONE_REMOTE   where the copies go, as rclone names it ("offsite:empower-backups").
#                          The remote's own access keys live in rclone's config, not here.
#   BACKUP_KEEP_DAYS       optional, 30 to 90 (default 60)
#   BACKUP_PRUNE           optional, "yes" (default) or "no": "no" when the storage key cannot
#                          delete and the bucket's own lifecycle rule removes old copies
#
# Usage:
#   DATABASE_URL=… BACKUP_AGE_RECIPIENT=age1… BACKUP_RCLONE_REMOTE=offsite:empower-backups \
#     bash scripts/backup-offsite.sh
#
# Note: while pg_dump runs, its connection string can be seen in this machine's process list.
# Run it on a computer only the team uses.
set -euo pipefail
umask 077

fail() { echo "backup-offsite: $*" >&2; exit 1; }

# ── 1. Everything needed is there ──
missing=()
[ -n "${DATABASE_URL:-}" ] || missing+=("DATABASE_URL")
[ -n "${BACKUP_RCLONE_REMOTE:-}" ] || missing+=("BACKUP_RCLONE_REMOTE")
if [ -z "${BACKUP_AGE_RECIPIENT:-}" ] && [ -z "${BACKUP_GPG_RECIPIENT:-}" ]; then
  missing+=("BACKUP_AGE_RECIPIENT or BACKUP_GPG_RECIPIENT")
fi
if [ "${#missing[@]}" -gt 0 ]; then
  list="$(printf '%s; ' "${missing[@]}")"
  fail "missing setting(s): ${list%; }. Nothing was done."
fi
if [ -n "${BACKUP_AGE_RECIPIENT:-}" ] && [ -n "${BACKUP_GPG_RECIPIENT:-}" ]; then
  fail "give BACKUP_AGE_RECIPIENT or BACKUP_GPG_RECIPIENT, not both. Nothing was done."
fi
case "$BACKUP_RCLONE_REMOTE" in
  *:*) ;;
  *) fail "BACKUP_RCLONE_REMOTE must look like 'remote:folder' (got '$BACKUP_RCLONE_REMOTE'). Nothing was done." ;;
esac

KEEP_DAYS="${BACKUP_KEEP_DAYS:-60}"
[[ "$KEEP_DAYS" =~ ^[0-9]+$ ]] && [ "$KEEP_DAYS" -ge 30 ] && [ "$KEEP_DAYS" -le 90 ] ||
  fail "BACKUP_KEEP_DAYS must be a number from 30 to 90 (got '$KEEP_DAYS'). Nothing was done."

PRUNE="${BACKUP_PRUNE:-yes}"
[ "$PRUNE" = yes ] || [ "$PRUNE" = no ] || fail "BACKUP_PRUNE must be yes or no (got '$PRUNE'). Nothing was done."

if [ -n "${BACKUP_AGE_RECIPIENT:-}" ]; then
  [[ "$BACKUP_AGE_RECIPIENT" == age1* ]] || fail "BACKUP_AGE_RECIPIENT must be an age public key (age1…), never a private key. Nothing was done."
  TOOL=age; EXT=age
else
  TOOL=gpg; EXT=gpg
fi
for t in pg_dump rclone "$TOOL" sha256sum; do
  command -v "$t" >/dev/null 2>&1 || fail "'$t' is not installed. Nothing was done."
done
if [ "$TOOL" = gpg ]; then
  gpg --batch --list-keys -- "$BACKUP_GPG_RECIPIENT" >/dev/null 2>&1 ||
    fail "the gpg public key '$BACKUP_GPG_RECIPIENT' is not in this machine's keyring. Nothing was done."
fi
rclone mkdir "$BACKUP_RCLONE_REMOTE" >/dev/null 2>&1 ||
  fail "rclone cannot reach '$BACKUP_RCLONE_REMOTE' (run 'rclone config' first). Nothing was done."

# The database, without its password, for the messages below.
DB_SHOWN="${DATABASE_URL#*://}"
DB_SHOWN="${DB_SHOWN#*@}"
DB_SHOWN="${DB_SHOWN%%\?*}"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
NAME="empower-db-$STAMP.dump.$EXT"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
OUT="$WORK/$NAME"

# ── 2. Dump, compressed and encrypted on the fly ──
echo "backup-offsite: dumping $DB_SHOWN (custom format, compressed), encrypted with $TOOL…"
encrypt() {
  if [ "$TOOL" = age ]; then
    age --encrypt --recipient "$BACKUP_AGE_RECIPIENT"
  else
    gpg --batch --yes --trust-model always --encrypt --recipient "$BACKUP_GPG_RECIPIENT"
  fi
}
if ! pg_dump --format=custom --compress=9 --no-password --dbname="$DATABASE_URL" | encrypt > "$OUT"; then
  fail "the dump or the encryption failed (see the message above). Nothing was sent."
fi

SIZE="$(wc -c < "$OUT" | tr -d ' ')"
[ "$SIZE" -gt 1024 ] || fail "the encrypted copy is only $SIZE bytes: something went wrong. Nothing was sent."
SUM="$(sha256sum "$OUT" | cut -d ' ' -f 1)"
echo "backup-offsite: encrypted copy ready: $NAME ($SIZE bytes, sha256 $SUM)"

# ── 3. Send it, then check it arrived with the same size ──
DEST="${BACKUP_RCLONE_REMOTE%/}/$NAME"
rclone copyto "$OUT" "$DEST"
REMOTE_SIZE="$(rclone lsf --max-depth 1 --files-only --format s --include "$NAME" "$BACKUP_RCLONE_REMOTE" 2>/dev/null | tr -d ' ')"
[ "$REMOTE_SIZE" = "$SIZE" ] || fail "the copy at $DEST has size '$REMOTE_SIZE', expected $SIZE. Check the remote."
echo "backup-offsite: sent to $DEST"

# ── 4. Copies older than KEEP_DAYS leave the remote (only files made by this script) ──
if [ "$PRUNE" = no ]; then
  echo "backup-offsite: old copies left to the bucket's lifecycle rule (BACKUP_PRUNE=no): it must remove them after $KEEP_DAYS days"
  echo "backup-offsite: done. Write in the backup log: $STAMP, $NAME, $SIZE bytes, sha256 $SUM."
  exit 0
fi
OLD="$(rclone lsf --max-depth 1 --files-only --min-age "${KEEP_DAYS}d" --include "empower-db-*.dump.*" "$BACKUP_RCLONE_REMOTE" 2>/dev/null || true)"
if [ -n "$OLD" ]; then
  rclone delete --max-depth 1 --min-age "${KEEP_DAYS}d" --include "empower-db-*.dump.*" "$BACKUP_RCLONE_REMOTE"
  echo "backup-offsite: deleted copies older than $KEEP_DAYS days:"
  echo "$OLD" | sed 's/^/  - /'
else
  echo "backup-offsite: no copy older than $KEEP_DAYS days to delete"
fi
echo "backup-offsite: done. Write in the backup log: $STAMP, $NAME, $SIZE bytes, sha256 $SUM."
