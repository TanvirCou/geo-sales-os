#!/usr/bin/env bash
set -e

echo "🚀 Starting GeoSales OS Auto-Deploy..."

# Pull latest code
git pull origin main

# Install packages
npm install

# Prisma database sync
npx prisma generate
npx prisma db push

# Build Next.js
npm run build

# Zero-downtime PM2 reload
pm2 reload ecosystem.config.cjs || pm2 start ecosystem.config.cjs

echo "✅ GeoSales OS deployed successfully!"
