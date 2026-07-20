#!/bin/sh
set -e

echo "⏳  Running database migrations..."
npm run migrate:latest
echo "✅  Migrations complete"

echo "🚀  Starting DemoCredit API on port ${PORT:-3000}..."
exec npm run start:docker
