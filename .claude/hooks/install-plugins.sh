#!/bin/bash
set -euo pipefail

# Only run in Claude Code remote environment
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Async mode - runs in background while session starts
echo '{"async": true, "asyncTimeout": 300000}'

echo "Installing Claude Code plugins..."

# Track installation results
SUCCEEDED=()
FAILED=()

install_plugin() {
  local plugin="$1"
  if claude plugin install "$plugin" --scope user 2>/dev/null; then
    SUCCEEDED+=("$plugin")
  else
    FAILED+=("$plugin")
  fi
}

# Add third-party marketplaces
if claude plugin marketplace add superpowers-marketplace 2>/dev/null; then
  echo "Added superpowers-marketplace"
else
  echo "Warning: Failed to add superpowers-marketplace"
fi

# Install plugins from official marketplace
install_plugin "feature-dev@claude-plugins-official"
install_plugin "supabase@claude-plugins-official"
install_plugin "pr-review-toolkit@claude-plugins-official"
install_plugin "greptile@claude-plugins-official"
install_plugin "sentry@claude-plugins-official"
install_plugin "code-simplifier@claude-plugins-official"

# Install plugins from third-party marketplaces
install_plugin "superpowers@superpowers-marketplace"

# Summary
echo ""
echo "=== Plugin Installation Summary ==="
if [ ${#SUCCEEDED[@]} -gt 0 ]; then
  echo "Installed: ${SUCCEEDED[*]}"
fi
if [ ${#FAILED[@]} -gt 0 ]; then
  echo "Failed: ${FAILED[*]}"
fi
echo "==================================="
