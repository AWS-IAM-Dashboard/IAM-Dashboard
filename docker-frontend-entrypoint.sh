#!/bin/sh
set -e
# When docker-compose mounts .:/app, the image's node_modules are hidden.
# /app/node_modules is a volume that is empty on first run. Install deps so dev server can start.
if [ ! -d /app/node_modules/@tailwindcss ]; then
  echo "Installing dependencies in container (node_modules volume empty)..."
  npm install
  chown -R app:app /app/node_modules
fi
exec gosu app npm run dev