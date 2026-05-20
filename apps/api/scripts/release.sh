#!/bin/sh
# Release-phase script run by Fly before swapping traffic to a new release.
# Runs Drizzle migrations against the production database.
set -eu

exec tsx /app/packages/database/migrate.ts
