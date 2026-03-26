#!/bin/sh
set -e
# When docker-compose mounts .:/app, the image's node_modules are hidden.
# /app/node_modules is a volume that is empty on first run. Install deps so dev server can start.
cd /app

LOCKFILE="/app/package-lock.json"
STAMP="/app/node_modules/.installed-lock.sha256"

need_install="0"

if [ ! -d /app/node_modules ]; then
  need_install="1"
elif [ ! -f "$LOCKFILE" ]; then
  echo "ERROR: package-lock.json missing; cannot run deterministic install."
  exit 1
elif [ ! -f "$STAMP" ]; then
  need_install="1"
else
  current_hash="$(sha256sum "$LOCKFILE" | awk '{print $1}')"
  installed_hash="$(cat "$STAMP" 2>/dev/null || true)"
  if [ "$current_hash" != "$installed_hash" ]; then
    need_install="1"
  fi
fi

if [ "$need_install" = "1" ]; then
  echo "Installing dependencies in container (npm ci)..."
  npm ci
  sha256sum "$LOCKFILE" | awk '{print $1}' > "$STAMP"
  chown -R app:app /app/node_modules
fi

# Support dev-only data modes (mock/live) consistently across environments.
# Vite's "--mode <name>" controls which .env.<name> file is loaded (e.g. .env.mock, .env.live).
MODE="${VITE_DATA_MODE:-live}"
exec su-exec app npm run dev -- --mode "$MODE"
