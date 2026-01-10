#!/bin/bash
# Stop hook: Guardrail validation (blocking)
#
# Runs type-check and lint before session ends.
# If errors found, blocks with instruction to fix.
#
# WHY blocking: These are objective errors that must be fixed.
# Type errors and lint issues break builds and CI.

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

run_type_check() {
  npm run type-check 2>&1
}

run_lint() {
  npm run lint 2>&1
}

count_type_errors() {
  local output="$1"
  # TypeScript outputs "error TS" for each error
  local count
  count=$(echo "$output" | grep -c "error TS" 2>/dev/null) || count=0
  echo "$count"
}

count_lint_issues() {
  local output="$1"
  # ESLint outputs "X problems" or "X warnings" at the end
  local count
  count=$(echo "$output" | grep -oE '[0-9]+ (problems?|warnings?)' | grep -oE '^[0-9]+' | head -1) || count=0
  echo "${count:-0}"
}

# Run validations
TYPE_CHECK_OUTPUT=$(run_type_check) || true
LINT_OUTPUT=$(run_lint) || true

TYPE_CHECK_ERRORS=$(count_type_errors "$TYPE_CHECK_OUTPUT")
LINT_ERRORS=$(count_lint_issues "$LINT_OUTPUT")

TOTAL_ERRORS=$((TYPE_CHECK_ERRORS + LINT_ERRORS))

# No errors - pass silently
if [ "$TOTAL_ERRORS" -eq 0 ]; then
  exit 0
fi

# Errors found - output blocking instruction
cat <<EOF
GUARDRAIL VALIDATION FAILED

Type-check errors: $TYPE_CHECK_ERRORS
Lint errors: $LINT_ERRORS

$TYPE_CHECK_OUTPUT

$LINT_OUTPUT

---
INSTRUCTION: You MUST fix these errors before ending the session.
Run: npm run type-check && npm run lint
EOF
