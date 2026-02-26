#!/usr/bin/env bash
# Symlinks gitignored env files from main worktree to child worktrees.
#
# Registered as:
#   - PostToolUse hook (Bash): detects `git worktree add`, syncs all worktrees
#   - SessionStart hook: syncs current dir if it's a child worktree
#   - Standalone: ./sync-worktree-env.sh <worktree-path>

set -euo pipefail

ENV_FILES=(
  ".env"
  ".env.sentry-build-plugin"
  "config/.env.local"
  "functions/.env"
)

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
MAIN_ROOT="$(git -C "$PROJECT_DIR" worktree list --porcelain 2>/dev/null | head -1 | sed 's/^worktree //')"

[ -z "$MAIN_ROOT" ] && exit 0

sync_env_to() {
  local target="$1"
  [ "$target" = "$MAIN_ROOT" ] && return

  local synced=0
  for rel_path in "${ENV_FILES[@]}"; do
    local src="$MAIN_ROOT/$rel_path"
    local dst="$target/$rel_path"

    [ -f "$src" ] || continue
    { [ -e "$dst" ] || [ -L "$dst" ]; } && continue

    mkdir -p "$(dirname "$dst")"
    ln -s "$src" "$dst"
    synced=$((synced + 1))
  done

  if [ "$synced" -gt 0 ]; then
    echo "sync-worktree-env: symlinked $synced env file(s) to $target" >&2
  fi
}

# Read hook event from stdin (if piped)
INPUT=""
[ ! -t 0 ] && INPUT=$(cat)

# Guard against missing jq — fall back to no-op
if command -v jq >/dev/null 2>&1; then
  EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // empty' 2>/dev/null || true)
else
  EVENT=""
fi

case "$EVENT" in
  PostToolUse)
    CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || true)
    echo "$CMD" | grep -q 'git worktree add' || exit 0
    # Sync all child worktrees (idempotent — skips already-linked files)
    git -C "$PROJECT_DIR" worktree list --porcelain \
      | grep '^worktree ' \
      | sed 's/^worktree //' \
      | while IFS= read -r wt; do
          sync_env_to "$wt"
        done
    ;;
  SessionStart)
    sync_env_to "$PROJECT_DIR"
    ;;
  *)
    # Standalone mode: pass worktree path as argument
    if [ $# -ge 1 ] && [ -d "$1" ]; then
      sync_env_to "$1"
    else
      # Fallback: if event was empty/unknown but we're in a child worktree, sync anyway
      sync_env_to "$PROJECT_DIR"
    fi
    ;;
esac
