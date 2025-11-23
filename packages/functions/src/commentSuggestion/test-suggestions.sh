#!/bin/bash

# Test script for generateCommentSuggestions function

FUNCTION_URL="https://generatecommentsuggestions-ifrsorhslq-uc.a.run.app"

# Test data - you'll need to replace with real IDs from your database
USER_ID="1y06BmkauwhIEwZm9LQmEmgl6Al1"  # Replace with a real user ID who has comment history
POST_ID="pk5qLN42ffuGFdYZORqH"  # Replace with a real post ID
BOARD_ID="CRJPASxq9FnY7otFfWjs"  # Active board ID

echo "Testing Comment Suggestion Generation"
echo "======================================"
echo "User ID: $USER_ID"
echo "Post ID: $POST_ID"
echo "Board ID: $BOARD_ID"
echo ""

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