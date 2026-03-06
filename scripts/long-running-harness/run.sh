#!/usr/bin/env bash
set -euo pipefail

#
# Long-Running Agent Harness
#
# Orchestrates the full eddys-flow pipeline using separate Claude Code CLI sessions.
# Each phase runs as a fresh `claude -p` invocation — no shared conversation memory.
# State between sessions is carried entirely by files on disk (openspec artifacts, git).
#
# Based on: https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
#

HARNESS_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$HARNESS_DIR/../.." && pwd)"

# --- Portability: macOS timeout shim (H8) ---
if ! command -v timeout &>/dev/null; then
  if command -v gtimeout &>/dev/null; then
    timeout() { gtimeout "$@"; }
  else
    echo "WARNING: 'timeout' not found. tsc gate will run without timeout." >&2
    timeout() { shift; "$@"; }
  fi
fi

# --- Arguments ---
CHANGE_NAME="${1:?Usage: run.sh <change-name> '<brief-description>'}"
BRIEF="${2:?Usage: run.sh <change-name> '<brief-description>'}"

# --- Input Validation ---
if [[ ! "$CHANGE_NAME" =~ ^[a-z0-9][a-z0-9-]{0,63}$ ]]; then
  echo "ERROR: CHANGE_NAME must be lowercase alphanumeric/hyphens only (max 64 chars), got: '$CHANGE_NAME'" >&2
  exit 1
fi

# --- Config ---
MODEL_PLANNING="${MODEL_PLANNING:-sonnet}"
MODEL_REVIEW="${MODEL_REVIEW:-opus}"
MODEL_APPLY="${MODEL_APPLY:-sonnet}"
MODEL_VERIFY="${MODEL_VERIFY:-sonnet}"
MAX_APPLY_SESSIONS="${MAX_APPLY_SESSIONS:-30}"
MAX_APPLY_RETRIES="${MAX_APPLY_RETRIES:-2}"

# --- Logging ---
RUN_ID="$(date +%Y%m%d-%H%M%S)"
LOG_DIR="$HARNESS_DIR/logs/$RUN_ID"
mkdir -p "$LOG_DIR"
chmod 700 "$LOG_DIR"
CHECKPOINT_FILE="$LOG_DIR/checkpoint"

log() {
  echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG_DIR/harness.log"
}

# --- Checkpoint ---
checkpoint_done() {
  local phase="$1"
  if [ -f "$CHECKPOINT_FILE" ]; then
    grep -qxF "$phase" "$CHECKPOINT_FILE"
  else
    return 1
  fi
}

checkpoint_save() {
  local phase="$1"
  echo "$phase" >> "$CHECKPOINT_FILE"
}

# --- Git Safety: use git as backup between sessions ---
# Based on: https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
# "Use git as a recovery mechanism"

git_snapshot() {
  # Create a lightweight tag before a session so we can rollback on failure
  local label="$1"
  local tag="harness/${CHANGE_NAME}/${label}"
  (cd "$PROJECT_DIR" && git tag -f "$tag" HEAD 2>/dev/null) || true
  log "GIT SNAPSHOT: $tag"
}

git_rollback() {
  # Rollback to pre-session snapshot: reset HEAD and discard changes
  local label="$1"
  local tag="harness/${CHANGE_NAME}/${label}"
  if (cd "$PROJECT_DIR" && git tag -l "$tag" | grep -q .); then
    log "GIT ROLLBACK: reverting to $tag"
    (cd "$PROJECT_DIR" && git reset --hard "$tag" && git clean -fd) 2>&1 | tee -a "$LOG_DIR/harness.log"
  else
    log "GIT ROLLBACK: tag $tag not found, skipping"
  fi
}

git_ensure_committed() {
  # After a session, check if the agent left uncommitted changes.
  # If so, create a safety commit so progress is not lost.
  local phase="$1"
  local status
  status=$(cd "$PROJECT_DIR" && git status --porcelain)
  if [ -n "$status" ]; then
    log "GIT SAFETY: Agent left uncommitted changes after '$phase' — creating safety commit"
    (cd "$PROJECT_DIR" && git add -A -- openspec/ src/ tests/ functions/ && git commit -m "harness($CHANGE_NAME): safety commit after $phase [uncommitted work]") 2>&1 | tee -a "$LOG_DIR/harness.log" || true
  fi
}

git_cleanup_tags() {
  # Remove harness snapshot tags at the end of a successful run
  log "GIT CLEANUP: removing harness snapshot tags"
  (cd "$PROJECT_DIR" && git tag -l "harness/${CHANGE_NAME}/*" | xargs -r git tag -d) 2>/dev/null || true
}

# --- Session Runner ---
run_session() {
  local phase="$1"
  local model="${2:-$MODEL_PLANNING}"
  local extra_context="${3:-}"
  local log_suffix="${4:-$(date +%H%M%S)}"
  local skip_checkpoint="${5:-false}"  # "true" when caller manages checkpoints (e.g., apply loop)

  # Skip if already completed (resume support)
  if [ "$skip_checkpoint" != "true" ] && checkpoint_done "$phase"; then
    log "SKIP (checkpoint): $phase already completed"
    return 0
  fi

  # Snapshot before session for rollback safety
  git_snapshot "$phase-$log_suffix"

  log "--- Starting session: $phase (model=$model) ---"
  local start_time exit_code=0
  start_time=$(date +%s)

  "$HARNESS_DIR/session.sh" \
    "$CHANGE_NAME" \
    "$phase" \
    "$model" \
    "$BRIEF" \
    "$LOG_DIR" \
    "$extra_context" \
    "$log_suffix" || exit_code=$?

  local end_time
  end_time=$(date +%s)
  local duration=$((end_time - start_time))
  log "--- Completed session: $phase (exit=$exit_code, ${duration}s) ---"

  if [ "$exit_code" -ne 0 ]; then
    log "ERROR: Session '$phase' failed (exit $exit_code)"
    # On failure: rollback uncommitted changes from the failed session
    git_rollback "$phase-$log_suffix"
    return "$exit_code"
  fi

  # On success: ensure any uncommitted work is committed
  git_ensure_committed "$phase"

  if [ "$skip_checkpoint" != "true" ]; then
    checkpoint_save "$phase"
  fi
  return 0
}

# --- tsc Gate ---
TSC_TIMEOUT="${TSC_TIMEOUT:-120}"

run_tsc_gate() {
  # Run tsc --noEmit and capture result safely (set -e safe)
  # Returns 0 on pass, 1 on fail. Sets TSC_ERRORS on failure.
  local output
  local exit_code
  TSC_ERRORS=""

  set +e
  output=$(cd "$PROJECT_DIR" && timeout "$TSC_TIMEOUT" npx tsc --noEmit 2>&1)
  exit_code=$?
  set -e

  if [ "$exit_code" -ne 0 ]; then
    # Truncate to last 100 lines
    TSC_ERRORS=$(echo "$output" | tail -100)
    log "TSC GATE: FAIL (exit $exit_code)"
    return 1
  fi

  log "TSC GATE: PASS"
  return 0
}

# --- Extract section content using awk (robust to special chars) ---

get_section_content() {
  # Extracts full section text under a ## header (primitive for get_section_unchecked)
  local group_name="$1"
  local tasks_file="$2"
  AWKS_GROUP="## $group_name" awk '
    BEGIN { group = ENVIRON["AWKS_GROUP"] }
    $0 == group      { in_section=1; next }
    /^## /           { in_section=0 }
    in_section       { print }
  ' "$tasks_file"
}

get_section_unchecked() {
  local group_name="$1"
  local tasks_file="$2"
  get_section_content "$group_name" "$tasks_file" | grep -c '^- \[ \]' || true
}

# --- Skill Detection ---
MATCH_SKILLS="$HARNESS_DIR/match-skills.sh"

# Search keywords to scan for in task content
SKILL_KEYWORDS="component tsx jsx hook useEffect useState useCallback test spec coverage firebase api/ fetch endpoint type interface"

detect_skills() {
  # Usage: detect_skills <phase> <content>
  # Returns: space-separated deduplicated skill names
  local phase="$1"
  local content="$2"
  local skills=""

  # Phase-level defaults
  case "$phase" in
    apply-group) skills="code-style" ;;
    verify)      skills="testing type-system code-style agent-browser" ;;
    design)      skills="daily-writing-friends-design" ;;
  esac

  # Scan content for keywords and resolve via match-skills.sh
  if [ -n "$content" ]; then
    for keyword in $SKILL_KEYWORDS; do
      if echo "$content" | grep -iqF "$keyword"; then
        local matched
        matched=$("$MATCH_SKILLS" "$keyword" 2>/dev/null || true)
        if [ -n "$matched" ]; then
          skills="$skills $matched"
        fi
      fi
    done
    # Also try multi-word keywords
    if echo "$content" | grep -iqF "cloud function"; then
      local matched
      matched=$("$MATCH_SKILLS" "cloud function" 2>/dev/null || true)
      [ -n "$matched" ] && skills="$skills $matched"
    fi
  fi

  # Deduplicate
  echo "$skills" | tr ' ' '\n' | sort -u | tr '\n' ' ' | sed 's/^ *//;s/ *$//'
}

# ============================================================
# Initialize
# ============================================================
log "=========================================="
log "  LONG-RUNNING HARNESS START"
log "=========================================="
log "Change:     $CHANGE_NAME"
log "Brief:      $BRIEF"
log "Run ID:     $RUN_ID"
log "Project:    $PROJECT_DIR"
log ""

CHANGE_DIR="$PROJECT_DIR/openspec/changes/$CHANGE_NAME"
if [ ! -d "$CHANGE_DIR" ]; then
  log "Creating openspec change folder..."
  (cd "$PROJECT_DIR" && openspec new change "$CHANGE_NAME" --schema eddys-flow) 2>&1 | tee -a "$LOG_DIR/harness.log"
fi

# ============================================================
# Phase 1: Planning (6 sessions)
# ============================================================
log ""
log "=========================================="
log "  PHASE 1: PLANNING"
log "=========================================="

# Skip planning sessions if artifact already exists (resume support)
# Fix H6: check checkpoint first, then artifact, then run
run_session_if_needed() {
  local phase="$1"
  local model="$2"
  local artifact="$3"

  if checkpoint_done "$phase"; then
    log "SKIP (checkpoint): $phase already completed"
    return 0
  fi
  if [ -s "$CHANGE_DIR/$artifact" ]; then
    log "SKIP (artifact exists): $phase — $artifact already present"
    checkpoint_save "$phase"
    return 0
  fi
  run_session "$phase" "$model"
}

run_session_if_needed "proposal"         "$MODEL_PLANNING" "proposal.md"
run_session_if_needed "proposal-review"  "$MODEL_REVIEW"   "proposal-review.md"
# Set skills for design phase
export HARNESS_SKILLS
HARNESS_SKILLS=$(detect_skills "design" "")
log "Skills for design: ${HARNESS_SKILLS:-none}"

run_session_if_needed "design"           "$MODEL_PLANNING" "design.md"
run_session_if_needed "design-review"    "$MODEL_REVIEW"   "design-review.md"

# Specs check: look for any spec file in specs/ (Fix C3: correct checkpoint logic)
if checkpoint_done "specs"; then
  log "SKIP (checkpoint): specs already completed"
elif [ -d "$CHANGE_DIR/specs" ] && [ -n "$(find "$CHANGE_DIR/specs" -name '*.md' 2>/dev/null | head -1)" ]; then
  log "SKIP (artifact exists): specs — spec files already present"
  checkpoint_save "specs"
else
  run_session "specs" "$MODEL_PLANNING"
fi

run_session_if_needed "tasks"            "$MODEL_PLANNING" "tasks.md"

# ============================================================
# Phase 2: Apply Loop (one session per task group)
# ============================================================
log ""
log "=========================================="
log "  PHASE 2: APPLY (one session per group)"
log "=========================================="

TASKS_FILE="$CHANGE_DIR/tasks.md"
if [ ! -f "$TASKS_FILE" ]; then
  log "ERROR: tasks.md not found at $TASKS_FILE"
  exit 1
fi

# Validate tasks.md structure before entering apply loop
GROUP_COUNT=$(grep -c '^## ' "$TASKS_FILE" || true)
if [ "$GROUP_COUNT" -eq 0 ]; then
  log "ERROR: tasks.md has no ## group headers — cannot parse task groups"
  exit 1
fi
TASK_COUNT=$(grep -c '^- \[ \]' "$TASKS_FILE" || true)
log "Validated tasks.md: $GROUP_COUNT groups, $TASK_COUNT unchecked tasks"

# Parse task group headers (## N. Name or ## Tests)
apply_session_num=0
actual_sessions_run=0
while IFS= read -r group_header; do
  group_name="${group_header#\#\# }"
  # Trim trailing whitespace
  group_name="${group_name%"${group_name##*[![:space:]]}"}"
  apply_session_num=$((apply_session_num + 1))

  if [ "$apply_session_num" -gt "$MAX_APPLY_SESSIONS" ]; then
    log "WARNING: Max apply sessions ($MAX_APPLY_SESSIONS) reached. Stopping."
    break
  fi

  # Skip groups where all tasks are already checked
  unchecked=$(get_section_unchecked "$group_name" "$TASKS_FILE")

  if [ "$unchecked" -eq 0 ]; then
    log "Skipping group '$group_name' — all tasks already complete"
    continue
  fi

  # Fix C1: use per-group checkpoint key
  checkpoint_key="apply-group:${group_name// /_}"
  if checkpoint_done "$checkpoint_key"; then
    log "SKIP (checkpoint): group '$group_name' already completed"
    continue
  fi

  # Apply with retry (max retries for incomplete groups)
  log_suffix="${apply_session_num}-${group_name// /_}"
  retry=0
  while [ "$retry" -le "$MAX_APPLY_RETRIES" ]; do
    log "Apply session $apply_session_num: '$group_name' ($unchecked unchecked, attempt $((retry + 1)))"

    # Detect and inject relevant skills for this group
    group_content=$(get_section_content "$group_name" "$TASKS_FILE")
    export HARNESS_SKILLS
    HARNESS_SKILLS=$(detect_skills "apply-group" "$group_content")
    log "Skills for '$group_name': ${HARNESS_SKILLS:-none}"

    run_session "apply-group" "$MODEL_APPLY" "Task group: $group_name" "$log_suffix-attempt$((retry + 1))" "true" || true
    actual_sessions_run=$((actual_sessions_run + 1))

    # tsc gate: catch type-breaking changes between groups
    if run_tsc_gate; then
      log "TSC gate passed after group '$group_name'"
    else
      log "TSC gate FAILED after group '$group_name' — will retry with tsc errors"
      retry=$((retry + 1))
      if [ "$retry" -le "$MAX_APPLY_RETRIES" ]; then
        # Retry same group with tsc errors as extra context
        log_suffix="${apply_session_num}-${group_name// /_}"
        run_session "apply-group" "$MODEL_APPLY" "Task group: $group_name
PREVIOUS ATTEMPT FAILED — tsc errors:
$TSC_ERRORS" "$log_suffix-attempt$((retry + 1))" "true" || true
        actual_sessions_run=$((actual_sessions_run + 1))
      fi
    fi

    # Re-check unchecked tasks
    unchecked=$(get_section_unchecked "$group_name" "$TASKS_FILE")
    if [ "$unchecked" -eq 0 ]; then
      log "Group '$group_name' complete"
      checkpoint_save "$checkpoint_key"
      break
    fi

    retry=$((retry + 1))
    if [ "$retry" -gt "$MAX_APPLY_RETRIES" ]; then
      log "WARNING: Group '$group_name' still has $unchecked unchecked tasks after $MAX_APPLY_RETRIES retries"
    fi
  done

done < <(grep '^## ' "$TASKS_FILE")

# --- Gap Report ---
total_unchecked=$(grep -c '^- \[ \]' "$TASKS_FILE" || true)
if [ "$total_unchecked" -gt 0 ]; then
  log "WARNING: $total_unchecked unchecked tasks remain after apply loop"
  grep '^- \[ \]' "$TASKS_FILE" > "$CHANGE_DIR/apply_gaps.md"
  log "Gap report written to $CHANGE_DIR/apply_gaps.md"
fi

# ============================================================
# Phase 3: Verification & Closing (5 sessions)
# ============================================================
log ""
log "=========================================="
log "  PHASE 3: VERIFICATION & CLOSING"
log "=========================================="

# Set skills for verify phase
export HARNESS_SKILLS
HARNESS_SKILLS=$(detect_skills "verify" "")
log "Skills for verify: ${HARNESS_SKILLS:-none}"

# Fix H1: verify with feedback loop — abort if verify fails after retries
MAX_VERIFY_RETRIES="${MAX_VERIFY_RETRIES:-2}"
verify_passed=false
for verify_iter in $(seq 1 "$MAX_VERIFY_RETRIES"); do
  log "Verify iteration $verify_iter of $MAX_VERIFY_RETRIES"
  run_session "verify" "$MODEL_VERIFY" "" "verify-iter${verify_iter}"
  actual_sessions_run=$((actual_sessions_run + 1))

  # Check if verify passed
  VERIFY_REPORT="$CHANGE_DIR/verify_report.md"
  if [ -f "$VERIFY_REPORT" ] && grep -qi "overall verdict.*pass" "$VERIFY_REPORT"; then
    verify_passed=true
    log "Verify PASSED"
    break
  fi

  if [ "$verify_iter" -lt "$MAX_VERIFY_RETRIES" ]; then
    log "Verify FAILED — re-running apply fixes before next verify..."
    # The verify session already attempts internal fixes;
    # on next iteration it gets a fresh chance
  fi
done

if [ "$verify_passed" = false ]; then
  log "WARNING: Verify did not pass after $MAX_VERIFY_RETRIES iterations. Continuing with caution."
fi

run_session "spec-alignment"       "$MODEL_PLANNING"
run_session "pull-request"         "$MODEL_PLANNING"

# --- Review-Response Phase ---
if command -v gh &>/dev/null; then
  PR_FILE="$CHANGE_DIR/pull-request.md"
  PR_NUMBER=""
  if [ -f "$PR_FILE" ]; then
    PR_NUMBER=$(grep -oE 'pull/[0-9]+' "$PR_FILE" | grep -oE '[0-9]+' | head -1 || true)
  fi

  if [ -z "$PR_NUMBER" ]; then
    log "WARNING: Could not extract PR number from pull-request.md — skipping review-response"
  else
    # Get repo info for API calls
    REPO_OWNER=$(cd "$PROJECT_DIR" && gh repo view --json owner -q '.owner.login' 2>/dev/null || true)
    REPO_NAME=$(cd "$PROJECT_DIR" && gh repo view --json name -q '.name' 2>/dev/null || true)

    if [ -n "$REPO_OWNER" ] && [ -n "$REPO_NAME" ]; then
      # Check for comments + non-approved reviews
      COMMENT_COUNT=$(gh api "repos/$REPO_OWNER/$REPO_NAME/pulls/$PR_NUMBER/comments" --jq 'length' 2>/dev/null || echo "0")
      REVIEW_COUNT=$(gh api "repos/$REPO_OWNER/$REPO_NAME/pulls/$PR_NUMBER/reviews" --jq '[.[] | select(.state != "APPROVED")] | length' 2>/dev/null || echo "0")

      TOTAL_FEEDBACK=$((COMMENT_COUNT + REVIEW_COUNT))
      if [ "$TOTAL_FEEDBACK" -gt 0 ]; then
        log "PR #$PR_NUMBER has $COMMENT_COUNT comments + $REVIEW_COUNT non-approved reviews — running review-response"
        run_session "review-response" "$MODEL_APPLY"
      else
        log "SKIP: PR #$PR_NUMBER has no review comments"
      fi
    else
      log "WARNING: Could not determine repo owner/name — skipping review-response"
    fi
  fi
else
  log "WARNING: gh CLI not available — skipping review-response"
fi

run_session "final-spec-alignment" "$MODEL_PLANNING"
run_session "retro"                "$MODEL_PLANNING"

# ============================================================
# Summary
# ============================================================
closing_sessions=4  # spec-alignment + pull-request + final-spec-alignment + retro
total_sessions=$((6 + actual_sessions_run + closing_sessions))

# Clean up snapshot tags on successful completion
git_cleanup_tags

log ""
log "=========================================="
log "  HARNESS COMPLETE"
log "=========================================="
log "Total sessions: $total_sessions"
log "Logs:           $LOG_DIR"

echo ""
echo "=== Long-Running Harness Summary ==="
echo "Change:     $CHANGE_NAME"
echo "Sessions:   $total_sessions (6 planning + $actual_sessions_run apply/verify + $closing_sessions closing)"
echo "Log dir:    $LOG_DIR"
echo ""
echo "Artifacts:  $CHANGE_DIR/"
echo "Git log:    git log --oneline"
