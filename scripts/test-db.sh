#!/usr/bin/env bash
# Tests the Supabase schema and its security rules on a throw-away local PostgreSQL.
# Needs PostgreSQL 15+ installed (initdb, pg_ctl, psql). Usage: npm run test:db
set -euo pipefail
cd "$(dirname "$0")/.."
PGBIN=$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)
PGBIN=${PGBIN:-$(dirname "$(command -v initdb)")}
DIR=$(mktemp -d)
RUN=""
if [ "$(id -u)" = "0" ]; then chown postgres "$DIR"; RUN="runuser -u postgres --"; fi
$RUN "$PGBIN/initdb" -D "$DIR/data" -U postgres -A trust >/dev/null
$RUN "$PGBIN/pg_ctl" -D "$DIR/data" -o "-p 5439 -k $DIR" -l "$DIR/log" start >/dev/null
trap '$RUN "$PGBIN/pg_ctl" -D "$DIR/data" stop -m fast >/dev/null; rm -rf "$DIR"' EXIT
sleep 1
P="psql -h $DIR -p 5439 -U postgres -v ON_ERROR_STOP=1 -q"
$P -c "create database aac"
$P -d aac -f supabase/tests/auth_stub.sql -f supabase/tests/storage_stub.sql
for f in supabase/migrations/*.sql; do $P -d aac -f "$f"; done
$P -d aac -f supabase/tests/scenario.sql 2>&1 | grep -E "ok —|PASSED|ERROR"
$P -d aac -c "delete from profiles; delete from auth.users;"
$P -d aac -f supabase/tests/storage_scenario.sql 2>&1 | grep -E "ok —|PASSED|ERROR"
$P -d aac -c "delete from profiles; delete from auth.users; delete from storage.objects;"
$P -d aac -f supabase/tests/security_scenario.sql 2>&1 | grep -E "ok —|PASSED|ERROR"
$P -d aac -c "delete from profiles; delete from auth.users; delete from storage.objects;"
$P -d aac -f supabase/tests/pro_profiles_scenario.sql 2>&1 | grep -E "ok —|PASSED|ERROR"
