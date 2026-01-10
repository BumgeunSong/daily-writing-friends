#!/bin/bash
# Stop hook: Suggestion validation (non-blocking)
#
# Checks for error handling patterns in modified files.
# Does NOT block - just surfaces recommendations.
#
# WHY non-blocking: These are subjective improvements
# that require human judgment to prioritize.

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Get modified files from git
get_modified_files() {
  {
    git diff --name-only 2>/dev/null
    git diff --cached --name-only 2>/dev/null
  } | sort -u | grep -E '\.(ts|tsx)$' || true
}

# Categorize file by path
get_category() {
  local file="$1"
  if echo "$file" | grep -q '/api/'; then
    echo "api"
  elif echo "$file" | grep -q '/hooks/'; then
    echo "hook"
  elif echo "$file" | grep -qE '/components/.*\.tsx$'; then
    echo "component"
  elif echo "$file" | grep -q '/functions/src/'; then
    echo "firebase-function"
  else
    echo "other"
  fi
}

# Check file for patterns
analyze_file() {
  local file="$1"
  local content

  if [ ! -f "$file" ]; then
    return
  fi

  content=$(cat "$file")

  # Skip test files
  if echo "$file" | grep -qE '\.(test|spec)\.(ts|tsx)$'; then
    return
  fi

  local has_async=false
  local has_try_catch=false
  local has_firestore=false
  local has_mutation=false
  local has_use_effect=false

  echo "$content" | grep -q 'async ' && has_async=true
  echo "$content" | grep -q 'try {' && has_try_catch=true
  echo "$content" | grep -qE 'collection\(|doc\(|addDoc|setDoc|updateDoc|deleteDoc|getDocs|getDoc' && has_firestore=true
  echo "$content" | grep -q 'useMutation' && has_mutation=true
  echo "$content" | grep -q 'useEffect' && has_use_effect=true

  echo "$has_async:$has_try_catch:$has_firestore:$has_mutation:$has_use_effect"
}

# Collect files by category
API_FILES=()
HOOK_FILES=()
COMPONENT_FILES=()
FUNCTION_FILES=()

while IFS= read -r file; do
  [ -z "$file" ] && continue

  category=$(get_category "$file")
  case "$category" in
    api) API_FILES+=("$file") ;;
    hook) HOOK_FILES+=("$file") ;;
    component) COMPONENT_FILES+=("$file") ;;
    firebase-function) FUNCTION_FILES+=("$file") ;;
  esac
done < <(get_modified_files)

# Check if any risky files found
TOTAL_FILES=$((${#API_FILES[@]} + ${#HOOK_FILES[@]} + ${#COMPONENT_FILES[@]} + ${#FUNCTION_FILES[@]}))

if [ "$TOTAL_FILES" -eq 0 ]; then
  exit 0
fi

# Check for risky patterns
HAS_RISKY=false
for file in "${API_FILES[@]}" "${HOOK_FILES[@]}" "${COMPONENT_FILES[@]}" "${FUNCTION_FILES[@]}"; do
  analysis=$(analyze_file "$file")
  if echo "$analysis" | grep -q 'true'; then
    HAS_RISKY=true
    break
  fi
done

if [ "$HAS_RISKY" = false ]; then
  exit 0
fi

# Output suggestions
cat <<'EOF'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 ERROR HANDLING SELF-CHECK (non-blocking)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EOF

if [ ${#API_FILES[@]} -gt 0 ]; then
  echo "📡 API Layer Changes Detected"
  echo "   ${#API_FILES[@]} file(s) edited"
  echo ""
  echo "   ❓ Are Firestore operations wrapped in try/catch?"
  echo "   ❓ Did you use batch writes for related operations?"
  echo ""
  echo "   💡 API Best Practice:"
  echo "      - Wrap Firestore calls in try/catch"
  echo "      - Use batch writes for atomic operations"
  echo "      - Return typed results (Promise<T>)"
  echo ""
fi

if [ ${#HOOK_FILES[@]} -gt 0 ]; then
  echo "🪝 Hook Changes Detected"
  echo "   ${#HOOK_FILES[@]} file(s) edited"
  echo ""
  echo "   ❓ Did you add onError handler to useMutation?"
  echo "   ❓ Is optimistic update implemented with rollback?"
  echo "   ❓ Does useEffect have proper cleanup?"
  echo ""
  echo "   💡 Hook Best Practice:"
  echo "      - Always handle mutation errors"
  echo "      - Implement optimistic updates with rollback"
  echo "      - Clean up subscriptions in useEffect"
  echo ""
fi

if [ ${#COMPONENT_FILES[@]} -gt 0 ]; then
  echo "⚛️  Component Changes Detected"
  echo "   ${#COMPONENT_FILES[@]} file(s) edited"
  echo ""
  echo "   ❓ Are loading/error states handled?"
  echo "   ❓ Is component following import order?"
  echo ""
  echo "   💡 Component Best Practice:"
  echo "      - Handle loading, error, empty states"
  echo "      - Follow import order: external → shared → feature"
  echo ""
fi

if [ ${#FUNCTION_FILES[@]} -gt 0 ]; then
  echo "🔥 Firebase Functions Changes Detected"
  echo "   ${#FUNCTION_FILES[@]} file(s) edited"
  echo ""
  echo "   ❓ Are operations wrapped in try/catch?"
  echo "   ❓ Does function return null gracefully on error?"
  echo ""
  echo "   💡 Functions Best Practice:"
  echo "      - Use try/catch, log errors with console.error"
  echo "      - Never throw - return null on error"
  echo "      - Export function in index.ts"
  echo ""
fi

cat <<'EOF'
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 These are suggestions only. Proceed at your discretion.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EOF
