#!/usr/bin/env bash
set -euo pipefail

#
# Unit tests for long-running harness functions
#

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HARNESS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_DIR="$(cd "$HARNESS_DIR/../.." && pwd)"
TEST_TMP="$(mktemp -d)"
PASS=0
FAIL=0

# --- Test Helpers ---
assert_eq() {
  local label="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "  PASS: $label"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $label"
    echo "    expected: '$expected'"
    echo "    actual:   '$actual'"
    FAIL=$((FAIL + 1))
  fi
}

assert_contains() {
  local label="$1" needle="$2" haystack="$3"
  if echo "$haystack" | grep -qF "$needle"; then
    echo "  PASS: $label"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $label — '$needle' not found in output"
    FAIL=$((FAIL + 1))
  fi
}

assert_empty() {
  local label="$1" actual="$2"
  if [ -z "$actual" ]; then
    echo "  PASS: $label"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $label — expected empty, got '$actual'"
    FAIL=$((FAIL + 1))
  fi
}

assert_not_contains() {
  local label="$1" needle="$2" haystack="$3"
  if ! echo "$haystack" | grep -qF "$needle"; then
    echo "  PASS: $label"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $label — '$needle' found in output (should not be)"
    FAIL=$((FAIL + 1))
  fi
}

cleanup() {
  rm -rf "$TEST_TMP"
  echo ""
  echo "================================"
  echo "Results: $PASS passed, $FAIL failed"
  echo "================================"
  [ "$FAIL" -eq 0 ]
}
trap cleanup EXIT

# --- Source harness functions ---
# We need to source just the functions from run.sh without executing the main script.
# Extract function definitions into a sourceable file.

extract_functions() {
  # Source required variables
  export HARNESS_DIR
  export PROJECT_DIR
  export LOG_DIR="$TEST_TMP/logs"
  export CHANGE_DIR="$TEST_TMP/change"
  export CHANGE_NAME="test-change"
  mkdir -p "$LOG_DIR" "$CHANGE_DIR"

  # Define log function
  log() { echo "[TEST] $*" >> "$LOG_DIR/harness.log"; }

  # Source get_section_content and get_section_unchecked
  eval "$(sed -n '/^get_section_content()/,/^}/p' "$HARNESS_DIR/run.sh")"
  eval "$(sed -n '/^get_section_unchecked()/,/^}/p' "$HARNESS_DIR/run.sh")"

  # Portability: timeout shim for tests (must actually enforce timeout)
  if ! command -v timeout &>/dev/null; then
    if command -v gtimeout &>/dev/null; then
      timeout() { gtimeout "$@"; }
    else
      # Use perl alarm for real timeout on macOS (perl is always available)
      timeout() { local dur="$1"; shift; perl -e 'alarm shift @ARGV; exec @ARGV' "$dur" "$@"; }
    fi
  fi

  # Source run_tsc_gate
  export TSC_TIMEOUT=2
  eval "$(sed -n '/^run_tsc_gate()/,/^}/p' "$HARNESS_DIR/run.sh")"
}

extract_functions

# ============================================================
# T.1: Test run_tsc_gate() under set -euo pipefail
# ============================================================
echo ""
echo "=== T.1: run_tsc_gate() ==="

# Create mock npx directory
MOCK_BIN="$TEST_TMP/mock-bin"
mkdir -p "$MOCK_BIN"

# Test: tsc passes
cat > "$MOCK_BIN/npx" << 'MOCK'
#!/usr/bin/env bash
echo "tsc ok"
exit 0
MOCK
chmod +x "$MOCK_BIN/npx"

(
  set -euo pipefail
  export PATH="$MOCK_BIN:$PATH"
  if run_tsc_gate; then
    echo "  PASS: tsc exit 0 → returns 0"
    echo "P" > "$TEST_TMP/t1a"
  else
    echo "  FAIL: tsc exit 0 → should return 0"
    echo "F" > "$TEST_TMP/t1a"
  fi
)
[ "$(cat "$TEST_TMP/t1a")" = "P" ] && PASS=$((PASS + 1)) || FAIL=$((FAIL + 1))

# Test: tsc fails — harness must NOT exit
cat > "$MOCK_BIN/npx" << 'MOCK'
#!/usr/bin/env bash
for i in $(seq 1 150); do echo "error TS$i: something wrong"; done
exit 1
MOCK
chmod +x "$MOCK_BIN/npx"

(
  set -euo pipefail
  export PATH="$MOCK_BIN:$PATH"
  TSC_ERRORS=""
  if run_tsc_gate; then
    echo "F" > "$TEST_TMP/t1b"
  else
    # Should reach here — harness did NOT exit
    echo "P" > "$TEST_TMP/t1b"
    echo "$TSC_ERRORS" > "$TEST_TMP/t1b_errors"
  fi
  # If we reach here, set -e did not kill us
  echo "alive" > "$TEST_TMP/t1b_alive"
)

if [ "$(cat "$TEST_TMP/t1b" 2>/dev/null)" = "P" ]; then
  echo "  PASS: tsc exit 1 → returns 1, harness survives"
  PASS=$((PASS + 1))
else
  echo "  FAIL: tsc exit 1 → harness should survive"
  FAIL=$((FAIL + 1))
fi

# Check truncation to 100 lines
error_lines=$(wc -l < "$TEST_TMP/t1b_errors" 2>/dev/null || echo "0")
error_lines=$(echo "$error_lines" | tr -d ' ')
if [ "$error_lines" -le 100 ]; then
  echo "  PASS: tsc errors truncated to ≤100 lines (got $error_lines)"
  PASS=$((PASS + 1))
else
  echo "  FAIL: tsc errors should be ≤100 lines, got $error_lines"
  FAIL=$((FAIL + 1))
fi

# Test: tsc hangs → killed by timeout
cat > "$MOCK_BIN/npx" << 'MOCK'
#!/usr/bin/env bash
exec sleep 999
MOCK
chmod +x "$MOCK_BIN/npx"

(
  set -euo pipefail
  export PATH="$MOCK_BIN:$PATH"
  export TSC_TIMEOUT=1
  run_tsc_gate || true
  echo "alive" > "$TEST_TMP/t1c"
)

if [ "$(cat "$TEST_TMP/t1c" 2>/dev/null)" = "alive" ]; then
  echo "  PASS: hanging tsc killed by timeout, harness survives"
  PASS=$((PASS + 1))
else
  echo "  FAIL: hanging tsc should be killed by timeout"
  FAIL=$((FAIL + 1))
fi

# ============================================================
# T.2: Test match-skills.sh
# ============================================================
echo ""
echo "=== T.2: match-skills.sh ==="

# Create fixture skills
FIXTURE_SKILLS="$TEST_TMP/fixture-project/.claude/skills"
FIXTURE_USER_SKILLS="$TEST_TMP/fixture-user/.claude/skills"
mkdir -p "$FIXTURE_SKILLS/react-component" "$FIXTURE_SKILLS/testing" "$FIXTURE_SKILLS/unsafe-skill"
mkdir -p "$FIXTURE_USER_SKILLS/react-component" "$FIXTURE_USER_SKILLS/user-only"

cat > "$FIXTURE_SKILLS/react-component/SKILL.md" << 'EOF'
---
name: react-component
description: Use when creating or modifying React components (.tsx files)
---
# Content
EOF

cat > "$FIXTURE_SKILLS/testing/SKILL.md" << 'EOF'
---
name: testing
description: Use when writing tests, adding coverage
---
# Content
EOF

cat > "$FIXTURE_SKILLS/unsafe-skill/SKILL.md" << 'EOF'
---
name: ../../etc
description: Malicious skill
---
# Content
EOF

cat > "$FIXTURE_USER_SKILLS/react-component/SKILL.md" << 'EOF'
---
name: react-component
description: User-level version of react-component
---
# User content
EOF

cat > "$FIXTURE_USER_SKILLS/user-only/SKILL.md" << 'EOF'
---
name: user-only
description: A user-only skill for browser testing
---
# User content
EOF

# Create a modified match-skills.sh that uses fixture dirs
FIXTURE_MATCH="$TEST_TMP/match-skills-fixture.sh"
sed "s|\"\$PROJECT_DIR/.claude/skills\"|\"$FIXTURE_SKILLS\"|;s|\"\$HOME/.claude/skills\"|\"$FIXTURE_USER_SKILLS\"|" "$HARNESS_DIR/match-skills.sh" > "$FIXTURE_MATCH"
chmod +x "$FIXTURE_MATCH"

result=$("$FIXTURE_MATCH" "component")
assert_contains "keyword 'component' → react-component" "react-component" "$result"

result=$("$FIXTURE_MATCH" "test")
assert_contains "keyword 'test' → testing" "testing" "$result"

result=$("$FIXTURE_MATCH" "nonexistent")
assert_empty "keyword 'nonexistent' → empty" "$result"

result=$("$FIXTURE_MATCH" "Component")
assert_contains "case-insensitive 'Component' → react-component" "react-component" "$result"

result=$("$FIXTURE_MATCH" "etc")
assert_not_contains "unsafe name ../../etc filtered out" "../../etc" "$result"

# Collision test: project-level shadows user-level
result=$("$FIXTURE_MATCH" "component")
count=$(echo "$result" | tr ' ' '\n' | grep -c 'react-component' || true)
assert_eq "collision: react-component appears once" "1" "$count"

# User-only skill found
result=$("$FIXTURE_MATCH" "browser")
assert_contains "user-only skill 'browser' → user-only" "user-only" "$result"

# ============================================================
# T.3: Test get_section_content()
# ============================================================
echo ""
echo "=== T.3: get_section_content() ==="

FIXTURE_TASKS="$TEST_TMP/fixture-tasks.md"
cat > "$FIXTURE_TASKS" << 'EOF'
## Group A
- [ ] task 1
- [x] task 2

## Group B (special & chars)
- [ ] task 3

## Tests
- [ ] test 1
EOF

result=$(get_section_content "Group A" "$FIXTURE_TASKS")
assert_contains "Group A → contains 'task 1'" "task 1" "$result"
assert_contains "Group A → contains 'task 2'" "task 2" "$result"

result=$(get_section_content "Group B (special & chars)" "$FIXTURE_TASKS")
assert_contains "Group B with special chars → task 3" "task 3" "$result"

# Returns raw text, not a count
lines=$(echo "$result" | wc -l | tr -d ' ')
assert_eq "Group B returns raw text (1 line)" "1" "$lines"

# ============================================================
# T.4: Test PR number extraction
# ============================================================
echo ""
echo "=== T.4: PR number extraction ==="

extract_pr() { echo "$1" | grep -oE 'pull/[0-9]+' | grep -oE '[0-9]+' | head -1; }

result=$(extract_pr "github.com/owner/repo/pull/123")
assert_eq "pull/123 → 123" "123" "$result"

result=$(extract_pr "https://github.com/foo/bar/pull/456")
assert_eq "pull/456 → 456" "456" "$result"

result=$(extract_pr "no pr url here" || true)
assert_empty "no PR URL → empty" "$result"

result=$(extract_pr "Step #1 then some text" || true)
assert_empty "Step #1 (no PR URL) → empty" "$result"

# ============================================================
# T.5: Test gap report
# ============================================================
echo ""
echo "=== T.5: gap report ==="

# Fixture with unchecked tasks
GAP_CHANGE_DIR="$TEST_TMP/gap-test"
mkdir -p "$GAP_CHANGE_DIR"
GAP_TASKS="$GAP_CHANGE_DIR/tasks.md"

cat > "$GAP_TASKS" << 'EOF'
## Group 1
- [ ] unchecked task
- [x] checked task
EOF

total_unchecked=$(grep -c '^- \[ \]' "$GAP_TASKS" || true)
if [ "$total_unchecked" -gt 0 ]; then
  grep '^- \[ \]' "$GAP_TASKS" > "$GAP_CHANGE_DIR/apply_gaps.md"
fi

if [ -f "$GAP_CHANGE_DIR/apply_gaps.md" ]; then
  echo "  PASS: apply_gaps.md written when unchecked tasks exist"
  PASS=$((PASS + 1))
else
  echo "  FAIL: apply_gaps.md should be written"
  FAIL=$((FAIL + 1))
fi

# Fixture with all checked
cat > "$GAP_TASKS" << 'EOF'
## Group 1
- [x] checked task 1
- [x] checked task 2
EOF

rm -f "$GAP_CHANGE_DIR/apply_gaps.md"
total_unchecked=$(grep -c '^- \[ \]' "$GAP_TASKS" || true)
if [ "$total_unchecked" -gt 0 ]; then
  grep '^- \[ \]' "$GAP_TASKS" > "$GAP_CHANGE_DIR/apply_gaps.md"
fi

if [ ! -f "$GAP_CHANGE_DIR/apply_gaps.md" ]; then
  echo "  PASS: no apply_gaps.md when all tasks checked"
  PASS=$((PASS + 1))
else
  echo "  FAIL: apply_gaps.md should not be written when all tasks checked"
  FAIL=$((FAIL + 1))
fi

# ============================================================
# T.6-T.8: Integration tests (placeholders)
# ============================================================
echo ""
echo "=== T.6-T.8: Integration tests (placeholders) ==="
echo "  SKIP: T.6 — dry-run apply loop requires full harness"
echo "  SKIP: T.7 — dry-run review-response requires gh CLI + PR"
echo "  SKIP: T.8 — dry-run skill injection requires claude CLI"
