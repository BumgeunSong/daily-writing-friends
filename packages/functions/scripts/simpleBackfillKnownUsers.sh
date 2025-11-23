#!/bin/bash

# Simple script to backfill known active users
# We'll start with the users we know have data

BACKFILL_URL="https://us-central1-artico-app-4f9d4.cloudfunctions.net/retroactiveBackfillHttp"

# Known active users
USERS=(
  "1IxdUtOSyGPCwFx531gOgNOC3a02"
  "GNFgpCWLqJMcyYZ32NecHALJpi72" 
  "WjUzRJwPAVOj3ZsVykJAHcGsA7r2"
  "1y06BmkauwhIEwZm9LQmEmgl6Al1"
)

echo "🚀 Starting backfill for ${#USERS[@]} known active users..."
echo ""

SUCCESS_COUNT=0
ERROR_COUNT=0

for i in "${!USERS[@]}"; do
  USER_ID="${USERS[$i]}"
  USER_NUM=$((i + 1))
  TOTAL=${#USERS[@]}
  
  echo "[$USER_NUM/$TOTAL] Backfilling user: $USER_ID"
  
  # Run backfill with dryRun=false
  RESPONSE=$(curl -s -X POST "$BACKFILL_URL" \
    -H "Content-Type: application/json" \
    -d "{\"userId\": \"$USER_ID\", \"dryRun\": false}")
  
  # Check if curl was successful
  if [ $? -eq 0 ]; then
    # Extract key info from JSON response (basic parsing)
    CURRENT_STREAK=$(echo "$RESPONSE" | grep -o '"currentStreak":[0-9]*' | cut -d':' -f2)
    STATUS=$(echo "$RESPONSE" | grep -o '"status":"[^"]*"' | cut -d':' -f2 | tr -d '"')
    POSTS_PROCESSED=$(echo "$RESPONSE" | grep -o '"postsProcessed":[0-9]*' | cut -d':' -f2)
    
    if [ ! -z "$CURRENT_STREAK" ] && [ ! -z "$STATUS" ]; then
      echo "   ✅ Success: $CURRENT_STREAK streak, status: $STATUS, $POSTS_PROCESSED posts"
      ((SUCCESS_COUNT++))
    else
      echo "   ⚠️  Unexpected response format"
      echo "   Response: $RESPONSE"
      ((ERROR_COUNT++))
    fi
  else
    echo "   ❌ Failed: Network error"
    ((ERROR_COUNT++))
  fi
  
  echo ""
  
  # Small delay between requests
  sleep 1
done

echo "📊 Backfill Summary:"
echo "   ✅ Successful: $SUCCESS_COUNT"
echo "   ❌ Failed: $ERROR_COUNT"
echo "   📈 Total: ${#USERS[@]}"
echo ""
echo "🎉 Backfill process complete!"