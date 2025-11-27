#!/bin/bash
# Clear Next.js build cache and restart

echo "🧹 Clearing Next.js build cache..."

# Remove .next folder
if [ -d ".next" ]; then
  rm -rf .next
  echo "✅ Removed .next folder"
else
  echo "ℹ️  .next folder not found"
fi

# Remove node_modules/.cache if it exists
if [ -d "node_modules/.cache" ]; then
  rm -rf node_modules/.cache
  echo "✅ Removed node_modules/.cache"
fi

# Remove any TypeScript build info
if [ -f "tsconfig.tsbuildinfo" ]; then
  rm -f tsconfig.tsbuildinfo
  echo "✅ Removed tsconfig.tsbuildinfo"
fi

echo ""
echo "✨ Cache cleared! Now restart your dev server:"
echo "   npm run dev"
echo "   or"
echo "   yarn dev"

