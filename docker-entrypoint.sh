#!/bin/sh
set -e

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "⏳  Running database migrations..."
  npm run migrate:latest
  echo "✅  Migrations complete"
else
  echo "⏭️   Skipping database migrations (RUN_MIGRATIONS=false)"
fi

echo "🚀  Starting DemoCredit API on port ${PORT:-3000}..."
exec npm run start:docker
