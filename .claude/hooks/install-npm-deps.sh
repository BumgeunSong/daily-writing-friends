#!/bin/bash
set -euo pipefail

# Only run in Claude Code remote environment
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Async mode - runs in background while session starts
echo '{"async": true, "asyncTimeout": 300000}'

cd "$CLAUDE_PROJECT_DIR"

# Install root project dependencies
echo "Installing root dependencies..."
npm install

# Install Firebase Functions dependencies
echo "Installing Firebase Functions dependencies..."
cd functions
npm install
cd ..

echo "npm dependencies installed."
