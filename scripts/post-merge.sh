#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter db push-force

# Data migration: rename legacy 'Profumi' category to 'Fragrance'
psql "$DATABASE_URL" -c "UPDATE products SET category = 'Fragrance' WHERE category = 'Profumi';"
