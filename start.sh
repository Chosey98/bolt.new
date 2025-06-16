#!/bin/sh
set -e

# Set default SESSION_SECRET if not provided
export SESSION_SECRET="${SESSION_SECRET:-bolt-super-secret-session-key-change-in-production-12345}"

# Set default PostgreSQL connection parameters
export POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
export POSTGRES_PORT="${POSTGRES_PORT:-5432}"
export POSTGRES_USER="${POSTGRES_USER:-bolt}"
export POSTGRES_DB="${POSTGRES_DB:-bolt}"

echo "Waiting for database to be ready..."
# Wait for PostgreSQL to be ready
until pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER"; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done

echo "Setting up database..."
echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting application..."
exec npx remix-serve build/server/index.js --port=${PORT:-3000}
