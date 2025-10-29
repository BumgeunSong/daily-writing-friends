#!/bin/bash

# Test backfill on a single user
# Usage: ./testBackfillSingleUser.sh <userId>

if [ -z "$1" ]; then
  echo "Usage: ./testBackfillSingleUser.sh <userId>"
  exit 1
fi

USER_ID=$1
FUNCTION_URL="https://us-central1-artico-app-4f9d4.cloudfunctions.net/backfillHistoricalEventsHttp"

echo "Testing backfill for user: $USER_ID"
echo "Function URL: $FUNCTION_URL"
echo ""

# Make the request
curl -X POST "$FUNCTION_URL?userId=$USER_ID" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo "Test complete!"
