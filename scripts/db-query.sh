#!/bin/bash

# Helper script for querying databases with environment selection
# Usage: ./scripts/db-query.sh [production|staging] [table] [limit]

# Determine which environment
ENV=${1:-staging}

case $ENV in
    production|prod)
        ENV_FILE=".env.local.production"
        echo "📊 Querying PRODUCTION database..."
        ;;
    staging|stage)
        ENV_FILE=".env.local.staging"
        echo "📊 Querying STAGING database..."
        ;;
    *)
        echo "Usage: $0 [production|staging] [table] [limit]"
        echo ""
        echo "Examples:"
        echo "  $0 staging examgenie_exams 5         # Query staging exams table"
        echo "  $0 production examgenie_questions 10 # Query production questions"
        echo "  $0 staging                           # Show staging tables"
        exit 1
        ;;
esac

# Check if env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: $ENV_FILE not found"
    exit 1
fi

# Extract table and limit from arguments
TABLE=${2:-}
LIMIT=${3:-10}

echo "🔌 Using: $ENV_FILE"
echo ""

# If no table specified, show available tables
if [ -z "$TABLE" ]; then
    echo "📚 Available tables:"
    echo "  - examgenie_exams"
    echo "  - examgenie_questions"
    echo "  - students"
    echo "  - rate_limits"
    echo "  - api_request_logs"
    echo "  - exam_results"
    echo ""
    echo "💡 Try: $0 $ENV examgenie_exams 5"
    exit 0
fi

# Run the query with the appropriate env file
npx tsx db-query.ts --env="$ENV_FILE" --table "$TABLE" --limit "$LIMIT"
