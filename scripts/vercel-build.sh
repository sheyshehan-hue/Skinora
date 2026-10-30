#!/bin/sh
# Vercel build: apply database migrations, optionally load the demo catalogue, then build.
# Set SEED_DEMO=1 only on a throwaway/demo database: the seed wipes every table first.
# The seed runs once, only while the database has no products.
set -e
prisma generate
prisma migrate deploy
if [ "$SEED_DEMO" = "1" ]; then
  if node -e "new (require('@prisma/client').PrismaClient)().product.count().then(n => process.exit(n ? 0 : 1)).catch(() => process.exit(1))"; then
    echo "Demo data already loaded, skipping seed"
  else
    tsx prisma/seed.ts
  fi
fi
next build
