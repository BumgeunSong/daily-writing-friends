#!/usr/bin/env bash
set -euo pipefail

#
# match-skills.sh — Frontmatter-driven skill matcher
#
# Searches all SKILL.md files for skills whose name or description
# matches the given keyword. Inspired by the force-eval hook approach.
#
# Usage: match-skills.sh <keyword>
# Output: space-separated skill names (empty if no match)
#

KEYWORD="${1:-}"
if [ -z "$KEYWORD" ]; then
  exit 0
fi

PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

# Skill name validation regex (prevents path traversal)
SAFE_NAME_RE='^[a-z0-9][a-z0-9_-]{0,63}$'

# Track seen names for deduplication (bash 3.2 compatible — no associative arrays)
SEEN_NAMES=""

is_seen() {
  echo "$SEEN_NAMES" | grep -qxF "$1" 2>/dev/null
}

mark_seen() {
  SEEN_NAMES="${SEEN_NAMES}${1}
"
}

match_in_directory() {
  local skills_dir="$1"
  [ -d "$skills_dir" ] || return 0

  for skill_file in "$skills_dir"/*/SKILL.md; do
    [ -f "$skill_file" ] || continue

    # Extract frontmatter between first two --- markers only
    local in_frontmatter=false
    local frontmatter_ended=false
    local name=""
    local description=""

    while IFS= read -r line; do
      if [ "$frontmatter_ended" = true ]; then
        break
      fi

      if [ "$line" = "---" ]; then
        if [ "$in_frontmatter" = true ]; then
          frontmatter_ended=true
          continue
        else
          in_frontmatter=true
          continue
        fi
      fi

      if [ "$in_frontmatter" = true ]; then
        # Extract name field
        if [[ "$line" =~ ^name:\ (.+)$ ]]; then
          name="${BASH_REMATCH[1]}"
        fi
        # Extract description field (handles colons in value via regex group)
        if [[ "$line" =~ ^description:\ (.+)$ ]]; then
          description="${BASH_REMATCH[1]}"
        fi
      fi
    done < "$skill_file"

    # Skip if no frontmatter found
    [ -n "$name" ] || continue

    # Validate skill name (prevent path traversal)
    if [[ ! "$name" =~ $SAFE_NAME_RE ]]; then
      continue
    fi

    # Skip if already seen (project-level takes priority)
    if is_seen "$name"; then
      continue
    fi

    # Match keyword against name and description (case-insensitive, fixed-string)
    if echo "$name" | grep -iqF "$KEYWORD" || echo "$description" | grep -iqF "$KEYWORD"; then
      mark_seen "$name"
      echo "$name"
    fi
  done
}

# Scan project-level first (priority), then user-level
match_in_directory "$PROJECT_DIR/.claude/skills"
match_in_directory "$HOME/.claude/skills"

exit 0
