#!/bin/bash

# Template for testing generateCommentSuggestions function
# Copy this to test-suggestions.sh and replace with your test data

FUNCTION_URL="YOUR_FUNCTION_URL_HERE"  # Replace with your deployed function URL

# Test data - Replace with real IDs from your database
USER_ID="YOUR_USER_ID_HERE"    # User who has comment history (commentStyleData)
POST_ID="YOUR_POST_ID_HERE"    # Post ID to generate suggestions for
BOARD_ID="YOUR_BOARD_ID_HERE"  # Board ID where the post exists

echo "Testing Comment Suggestion Generation"
echo "======================================"
echo "User ID: $USER_ID"
echo "Post ID: $POST_ID"
echo "Board ID: $BOARD_ID"
echo ""

# Validate required variables
if [[ "$USER_ID" == "YOUR_USER_ID_HERE" || "$POST_ID" == "YOUR_POST_ID_HERE" || "$BOARD_ID" == "YOUR_BOARD_ID_HERE" ]]; then
    echo "❌ Error: Please replace placeholder values with real IDs"
    echo ""
    echo "How to find test data:"
    echo "1. Find a user with comment history: Check users/{userId}/commentStyleData collection"
    echo "2. Find a post: Check boards/{boardId}/posts collection" 
    echo "3. Get your function URL from: firebase functions:list"
    echo ""
    exit 1
fi

# Make the request and decode Unicode
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"postId\": \"$POST_ID\",
    \"boardId\": \"$BOARD_ID\"
  }" | python3 -c "
import json
import sys

try:
    data = json.load(sys.stdin)
    print(json.dumps(data, ensure_ascii=False, indent=2))
except Exception as e:
    print(f'Error parsing JSON: {e}')
    sys.stdin.seek(0)
    print(sys.stdin.read())
"

echo ""
echo "Test complete!"