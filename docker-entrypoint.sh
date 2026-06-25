#!/bin/sh
set -e

echo "Running database migrations..."
node ./node_modules/typeorm/cli.js migration:run -d dist/config/data-source.js

if [ "${RUN_SEED_ON_START:-true}" = "true" ]; then
  echo "Seeding circles..."
  node dist/scripts/seed-circles.js
fi

echo "Starting API..."
exec "$@"
