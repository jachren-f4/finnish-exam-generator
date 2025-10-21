#!/bin/bash

# Helper script for viewing latest exams with readable output
# Usage: ./scripts/db-latest-exams.sh [production|staging] [limit]

# Determine which environment
ENV=${1:-staging}
LIMIT=${2:-5}

case $ENV in
    production|prod)
        ENV_FILE=".env.local.production"
        echo "📊 Fetching latest ${LIMIT} exams from PRODUCTION database..."
        ;;
    staging|stage)
        ENV_FILE=".env.local.staging"
        echo "📊 Fetching latest ${LIMIT} exams from STAGING database..."
        ;;
    *)
        echo "Usage: $0 [production|staging] [limit]"
        echo ""
        echo "Examples:"
        echo "  $0 staging 10        # Get 10 latest exams from staging"
        echo "  $0 production 5      # Get 5 latest exams from production"
        echo "  $0 staging           # Get 5 latest exams from staging (default)"
        exit 1
        ;;
esac

# Check if env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: $ENV_FILE not found"
    exit 1
fi

echo ""

# Use the existing db-query tool with environment override
npx tsx db-query.ts --env="$ENV_FILE" --table examgenie_exams --limit "$LIMIT"
