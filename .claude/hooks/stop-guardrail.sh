#!/bin/bash
# Stop hook: Guardrail validation (blocking)
#
# Runs type-check (full project) and lint (modified files only) before session ends.
# Only blocks on actual errors, not warnings.
#
# WHY blocking: Type errors and lint errors break builds and CI.
# WHY modified-only lint: Pre-existing warnings shouldn't block current work.

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

# --- Type check (whole project — fast, no way to scope) ---
TYPE_CHECK_EXIT=0
TYPE_CHECK_OUTPUT=$(npm run type-check 2>&1) || TYPE_CHECK_EXIT=$?
TYPE_CHECK_ERRORS=$(echo "$TYPE_CHECK_OUTPUT" | grep -c "error TS" 2>/dev/null) || TYPE_CHECK_ERRORS=0
# Non-zero exit without "error TS" lines means config/deps failure — still block
if [ "$TYPE_CHECK_EXIT" -ne 0 ] && [ "$TYPE_CHECK_ERRORS" -eq 0 ]; then
  TYPE_CHECK_ERRORS=1
fi

# --- Lint (only modified .ts/.tsx files, excluding functions/ and deleted files) ---
MODIFIED_FILES=$(
  {
    git diff --name-only --diff-filter=ACMR 2>/dev/null
    git diff --cached --name-only --diff-filter=ACMR 2>/dev/null
  } | sort -u | grep -E '\.(ts|tsx)$' | grep -v '^functions/' || true
)

LINT_ERRORS=0
LINT_OUTPUT=""

if [ -n "$MODIFIED_FILES" ]; then
  ESLINT_EXIT=0
  # shellcheck disable=SC2086
  LINT_OUTPUT=$(npx eslint --no-warn-ignored --quiet $MODIFIED_FILES 2>&1) || ESLINT_EXIT=$?
  # --quiet suppresses warnings, only shows errors
  LINT_ERRORS=$(echo "$LINT_OUTPUT" | grep -cE '^\s+[0-9]+:[0-9]+\s+error' 2>/dev/null) || LINT_ERRORS=0
  # Non-zero exit without parsed error lines means config/runtime failure — still block
  if [ "$ESLINT_EXIT" -ne 0 ] && [ "$LINT_ERRORS" -eq 0 ]; then
    LINT_ERRORS=1
  fi
fi

TOTAL_ERRORS=$((TYPE_CHECK_ERRORS + LINT_ERRORS))

# No errors - pass silently
if [ "$TOTAL_ERRORS" -eq 0 ]; then
  exit 0
fi

# Errors found - block via exit code 2 (stderr shown to Claude)
cat <<EOF >&2
GUARDRAIL VALIDATION FAILED

Type-check errors: $TYPE_CHECK_ERRORS
Lint errors: $LINT_ERRORS (modified files only)

$TYPE_CHECK_OUTPUT

$LINT_OUTPUT

---
Fix these errors before ending the session.
EOF
exit 2
