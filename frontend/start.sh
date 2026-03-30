#!/bin/bash
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/forge
cd /app/apps/web
exec /app/apps/web/node_modules/.bin/next dev -p 3000
