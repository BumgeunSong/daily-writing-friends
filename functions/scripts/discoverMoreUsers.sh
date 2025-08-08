#!/bin/bash

# Script to discover more active users by testing various user IDs
# This helps us find all users who have posting data

BACKFILL_URL="https://us-central1-artico-app-4f9d4.cloudfunctions.net/retroactiveBackfillHttp"

# Test some common user ID patterns or add specific IDs you want to check
# You can expand this list with any user IDs you want to test
TEST_USER_IDS=(
  # Add any additional user IDs you want to test here
  # "example-user-id-1"
  # "example-user-id-2"
)

echo "🔍 Discovering additional active users..."
echo ""

if [ ${#TEST_USER_IDS[@]} -eq 0 ]; then
  echo "ℹ️  No additional user IDs provided to test."
  echo "   To discover more users, add their IDs to the TEST_USER_IDS array in this script."
  echo ""
  echo "✅ Already backfilled users:"
  echo "   - 1IxdUtOSyGPCwFx531gOgNOC3a02 (4-day streak)"
  echo "   - GNFgpCWLqJMcyYZ32NecHALJpi72 (2-day streak)"  
  echo "   - WjUzRJwPAVOj3ZsVykJAHcGsA7r2 (5-day streak)"
  echo "   - 1y06BmkauwhIEwZm9LQmEmgl6Al1 (132-day streak)"
  echo ""
  echo "🎯 To find more users, you can:"
  echo "   1. Check your Firebase console for user IDs"
  echo "   2. Look at posting collection documents for authorId fields"
  echo "   3. Check board permissions for write-enabled users"
  echo ""
  exit 0
fi

ACTIVE_USERS=()
INACTIVE_COUNT=0

for i in "${!TEST_USER_IDS[@]}"; do
  USER_ID="${TEST_USER_IDS[$i]}"
  USER_NUM=$((i + 1))
  TOTAL=${#TEST_USER_IDS[@]}
  
  echo "[$USER_NUM/$TOTAL] Testing user: $USER_ID"
  
  # Run dry-run first to check if user has data
  RESPONSE=$(curl -s -X POST "$BACKFILL_URL" \
    -H "Content-Type: application/json" \
    -d "{\"userId\": \"$USER_ID\", \"dryRun\": true}")
  
  if [ $? -eq 0 ]; then
    POSTS_PROCESSED=$(echo "$RESPONSE" | grep -o '"postsProcessed":[0-9]*' | cut -d':' -f2)
    
    if [ ! -z "$POSTS_PROCESSED" ] && [ "$POSTS_PROCESSED" -gt 0 ]; then
      CURRENT_STREAK=$(echo "$RESPONSE" | grep -o '"currentStreak":[0-9]*' | cut -d':' -f2)
      echo "   ✅ Active user found: $POSTS_PROCESSED posts, $CURRENT_STREAK streak"
      ACTIVE_USERS+=("$USER_ID")
    else
      echo "   ⚪ No posting data"
      ((INACTIVE_COUNT++))
    fi
  else
    echo "   ❌ Network error"
  fi
  
  # Small delay between requests
  sleep 0.5
done

echo ""
echo "🔍 Discovery Summary:"
echo "   ✅ Active users found: ${#ACTIVE_USERS[@]}"
echo "   ⚪ Users without data: $INACTIVE_COUNT"

if [ ${#ACTIVE_USERS[@]} -gt 0 ]; then
  echo ""
  echo "📋 Active users discovered:"
  for user in "${ACTIVE_USERS[@]}"; do
    echo "   - $user"
  done
  
  echo ""
  read -p "🚀 Run backfill for these ${#ACTIVE_USERS[@]} discovered users? (y/N): " -n 1 -r
  echo ""
  
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Starting backfill for discovered users..."
    
    for i in "${!ACTIVE_USERS[@]}"; do
      USER_ID="${ACTIVE_USERS[$i]}"
      USER_NUM=$((i + 1))
      TOTAL=${#ACTIVE_USERS[@]}
      
      echo "[$USER_NUM/$TOTAL] Backfilling: $USER_ID"
      
      RESPONSE=$(curl -s -X POST "$BACKFILL_URL" \
        -H "Content-Type: application/json" \
        -d "{\"userId\": \"$USER_ID\", \"dryRun\": false}")
      
      if [ $? -eq 0 ]; then
        CURRENT_STREAK=$(echo "$RESPONSE" | grep -o '"currentStreak":[0-9]*' | cut -d':' -f2)
        STATUS=$(echo "$RESPONSE" | grep -o '"status":"[^"]*"' | cut -d':' -f2 | tr -d '"')
        echo "   ✅ Success: $CURRENT_STREAK streak, status: $STATUS"
      else
        echo "   ❌ Failed"
      fi
      
      sleep 1
    done
    
    echo ""
    echo "🎉 Backfill complete for discovered users!"
  else
    echo "ℹ️  Skipped backfill for discovered users."
  fi
fi

echo ""
echo "✅ Discovery process complete!"