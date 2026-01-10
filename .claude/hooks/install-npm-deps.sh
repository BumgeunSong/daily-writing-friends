#!/bin/bash
set -euo pipefail

# Only run in Claude Code remote environment
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Async mode - runs in background while session starts
echo '{"async": true, "asyncTimeout": 300000}'

cd "$CLAUDE_PROJECT_DIR"

# Install GitHub CLI if not present
if ! command -v gh &> /dev/null; then
  echo "Installing GitHub CLI..."
  (type -p wget >/dev/null || (sudo apt update && sudo apt-get install wget -y)) \
    && sudo mkdir -p -m 755 /etc/apt/keyrings \
    && out=$(mktemp) && wget -nv -O$out https://cli.github.com/packages/githubcli-archive-keyring.gpg \
    && cat $out | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null \
    && sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && sudo apt update \
    && sudo apt install gh -y
fi

# Install root project dependencies
echo "Installing root dependencies..."
if npm install; then
  echo "Root dependencies installed successfully."
else
  echo "ERROR: Failed to install root dependencies."
  exit 1
fi

# Verify node_modules exists
if [ ! -d "node_modules" ]; then
  echo "ERROR: node_modules directory not found after npm install."
  exit 1
fi

# Install Firebase Functions dependencies
echo "Installing Firebase Functions dependencies..."
cd functions
if npm install; then
  echo "Firebase Functions dependencies installed successfully."
else
  echo "ERROR: Failed to install Firebase Functions dependencies."
  exit 1
fi

# Verify functions/node_modules exists
if [ ! -d "node_modules" ]; then
  echo "ERROR: functions/node_modules directory not found after npm install."
  exit 1
fi
cd ..

echo "All npm dependencies installed successfully."
