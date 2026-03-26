#!/bin/sh
set -e
# When docker-compose mounts .:/app, the image's node_modules are hidden.
# /app/node_modules is a volume that is empty on first run. Install deps so dev server can start.
if [ ! -d /app/node_modules/@tailwindcss ]; then
  echo "Installing dependencies in container (node_modules volume empty)..."
  npm ci
  chown -R app:app /app/node_modules
fi

# Support dev-only data modes (mock/live) consistently across environments.
# Vite's "--mode <name>" controls which .env.<name> file is loaded (e.g. .env.mock, .env.live).
MODE="${VITE_DATA_MODE:-live}"
exec su-exec app npm run dev -- --mode "$MODE"
