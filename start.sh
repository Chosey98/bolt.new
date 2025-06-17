#!/bin/sh
set -e

# Set default SESSION_SECRET if not provided
export SESSION_SECRET="${SESSION_SECRET:-bolt-super-secret-session-key-change-in-production-12345}"

# Set default PostgreSQL connection parameters
export POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
export POSTGRES_PORT="${POSTGRES_PORT:-5432}"
export POSTGRES_USER="${POSTGRES_USER:-bolt}"
export POSTGRES_DB="${POSTGRES_DB:-bolt}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-bolt_password_change_in_production}"

echo "Database connection details:"
echo "---------------------------"
echo "Host: $POSTGRES_HOST"
echo "Port: $POSTGRES_PORT"
echo "User: $POSTGRES_USER"
echo "Database: $POSTGRES_DB"
echo "Database URL: $DATABASE_URL"
echo "---------------------------"

echo "Waiting for database to be ready..."
# Wait for PostgreSQL to be ready
until pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER"; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done

# Additional wait to ensure database is fully initialized
sleep 5

echo "Setting up database..."
echo "Running database migrations..."

# Try to run migrations with retries
max_attempts=5
attempt=1

while [ $attempt -le $max_attempts ]; do
  echo "Migration attempt $attempt of $max_attempts..."
  if npx prisma migrate deploy; then
    echo "Migrations completed successfully"
    break
  else
    echo "Migration attempt $attempt failed"
    if [ $attempt -eq $max_attempts ]; then
      echo "All migration attempts failed"
      exit 1
    fi
    attempt=$((attempt + 1))
    sleep 5
  fi
done

echo "Starting application..."
exec npx remix-serve build/server/index.js --port=${PORT:-3000}
