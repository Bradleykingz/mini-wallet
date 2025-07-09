#!/bin/sh
set -e

# Wait for services
dockerize -wait tcp://redis:6379 -wait tcp://db:5432 -timeout 30s

# Run migrations
npm run migrate

# Start app
node dist/server.js