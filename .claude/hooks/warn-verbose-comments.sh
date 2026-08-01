#!/bin/bash
# PostToolUse hook: nudge away from verbose AI comments in Edit/Write (non-blocking).
#
# WHY warn-only (additionalContext, exit 0): comment necessity is a judgment call, so a
#   hard block would spend its life fighting false positives. This just reminds.
# WHY leading-line (^ //) only: it targets the classic "AI explains the next line" pattern
#   while side-stepping URLs and strings, which never start a line with //.
# WHY a one-shot marker file: lets the agent keep a genuinely necessary comment without
#   leaving a skip-directive token behind in the source.

set -euo pipefail

INPUT=$(cat)

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
MARKER="$PROJECT_DIR/.claude/.allow-comments"

FILE=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // ""')
# Edit carries the added block in new_string; Write carries the whole file in content.
ADDED=$(printf '%s' "$INPUT" | jq -r '.tool_input.new_string // .tool_input.content // ""')

case "$FILE" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs) ;;
  *) exit 0 ;;
esac

[ -z "$ADDED" ] && exit 0

if [ -f "$MARKER" ]; then
  rm -f "$MARKER"
  exit 0
fi

EXEMPT='eslint-disable|ts-expect-error|ts-ignore|ts-nocheck|biome-ignore|prettier-ignore|(c8|v8|istanbul) ignore|TODO|FIXME|HACK'

# JSDoc /** */ and license /* */ blocks use * lines, not //, so they are never counted.
LEADING=$(printf '%s\n' "$ADDED" | grep -E '^[[:space:]]*//' || true)
TOTAL=$(printf '%s\n' "$LEADING" | grep -cE '.' || true)
EXEMPTED=$(printf '%s\n' "$LEADING" | grep -cEi "$EXEMPT" || true)
COUNT=$((TOTAL - EXEMPTED))

[ "$COUNT" -le 0 ] && exit 0

BASENAME=$(basename "$FILE")
MSG="⚠ comment check: ${COUNT} comment line(s) added in ${BASENAME}.
Prefer self-explanatory names/functions over comments.
Drop WHAT-comments that restate the code. Keep only a WHY-comment — intent, a non-obvious constraint, or a gotcha the next dev needs and the code can't express — and keep it minimal (use JSDoc for real API docs).
e.g. drop \`// increment count\`; keep \`// API returns null, not 404, for deleted users\`
Intentional? \`touch .claude/.allow-comments\` before the edit."

jq -n --arg ctx "$MSG" '{hookSpecificOutput:{hookEventName:"PostToolUse",additionalContext:$ctx}}'
exit 0
