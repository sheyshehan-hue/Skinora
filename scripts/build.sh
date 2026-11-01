#!/bin/sh
# Production build. Prerendering runs many database queries at once, and Prisma's default
# pool of 3 connections times out (P2024) over the long link from the build machine to the
# database. Give the build a bigger pool and a longer wait. Same fix as on the ai-skin-scan branch.
set -e
prisma generate
if [ -n "$DATABASE_URL" ]; then
  case "$DATABASE_URL" in *\?*) SEP="&" ;; *) SEP="?" ;; esac
  DATABASE_URL="${DATABASE_URL}${SEP}connection_limit=10&pool_timeout=60" next build
else
  next build
fi
