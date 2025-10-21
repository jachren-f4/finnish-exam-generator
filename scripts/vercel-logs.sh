#!/bin/bash

# Helper script for fetching Vercel logs with authentication
# Usage: ./scripts/vercel-logs.sh [production|staging]

# Load environment variables
if [ -f .env.local ]; then
    export $(grep VERCEL_TOKEN .env.local | xargs)
else
    echo "Error: .env.local not found"
    exit 1
fi

# Determine which environment
ENV=${1:-production}

case $ENV in
    production|prod)
        URL="examgenie.app"
        echo "📊 Fetching logs from PRODUCTION (examgenie.app)..."
        ;;
    staging|stage)
        URL="exam-generator-staging.vercel.app"
        echo "📊 Fetching logs from STAGING (exam-generator-staging.vercel.app)..."
        ;;
    *)
        echo "Usage: $0 [production|staging]"
        echo "Example: $0 production"
        echo "Example: $0 staging"
        exit 1
        ;;
esac

echo "⏳ Streaming logs in real-time (Ctrl+C to stop)..."
echo ""

# Stream logs
npx vercel logs "$URL" --token "$VERCEL_TOKEN"
