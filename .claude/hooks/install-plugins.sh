#!/bin/bash
set -euo pipefail

# Only run in Claude Code remote environment
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Async mode - runs in background while session starts
echo '{"async": true, "asyncTimeout": 300000}'

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

echo "Claude Code plugins installed."
