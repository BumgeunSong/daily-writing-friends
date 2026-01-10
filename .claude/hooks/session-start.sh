#!/bin/bash
set -euo pipefail

# Only run in Claude Code remote environment
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Install root project dependencies
echo "Installing root dependencies..."
npm install

# Install Firebase Functions dependencies
echo "Installing Firebase Functions dependencies..."
cd functions
npm install
cd ..

# Install Claude Code plugins
echo "Installing Claude Code plugins..."

# Add third-party marketplaces
claude plugin marketplace add superpowers-marketplace || true

# Install plugins from official marketplace
claude plugin install feature-dev@claude-plugins-official --scope user || true
claude plugin install supabase@claude-plugins-official --scope user || true
claude plugin install pr-review-toolkit@claude-plugins-official --scope user || true
claude plugin install greptile@claude-plugins-official --scope user || true
claude plugin install sentry@claude-plugins-official --scope user || true
claude plugin install code-simplifier@claude-plugins-official --scope user || true

# Install plugins from third-party marketplaces
claude plugin install superpowers@superpowers-marketplace --scope user || true

echo "Session start setup complete."
