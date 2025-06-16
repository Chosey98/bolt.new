#!/bin/sh
set -e

# Set default SESSION_SECRET if not provided
export SESSION_SECRET="${SESSION_SECRET:-bolt-super-secret-session-key-change-in-production-12345}"

echo "Setting up database..."
if [ ! -f "./dev.db" ]; then
  echo "Creating database..."
  DATABASE_URL="${DATABASE_URL:-file:./dev.db}" npx prisma db push --accept-data-loss
else
  echo "Database already exists, skipping creation..."
fi

echo "Starting application..."
exec npx remix-serve build/server/index.js --port=${PORT}
