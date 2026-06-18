#!/bin/sh

# Exit immediately if a command exits with a non-zero status
set -e

echo "Running database migrations..."
npm run prisma:deploy

echo "Starting the application..."
# exec ensures the node process becomes PID 1, handling signals correctly
exec npm start