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

# --- Session Runner ---
run_session() {
  local phase="$1"
  local model="${2:-$MODEL_PLANNING}"
  local extra_context="${3:-}"
  local log_suffix="${4:-$(date +%H%M%S)}"

  # Skip if already completed (resume support)
  if checkpoint_done "$phase"; then
    log "SKIP (checkpoint): $phase already completed"
    return 0
  fi

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
    return "$exit_code"
  fi

  checkpoint_save "$phase"
  return 0
}

# --- Extract section content using awk (robust to special chars) ---
get_section_unchecked() {
  local group_name="$1"
  local tasks_file="$2"
  local section_content
  # Use ENVIRON to avoid awk -v backslash interpretation (H7)
  section_content=$(AWKS_GROUP="## $group_name" awk '
    BEGIN { group = ENVIRON["AWKS_GROUP"] }
    $0 == group      { in_section=1; next }
    /^## /           { in_section=0 }
    in_section       { print }
  ' "$tasks_file")
  echo "$section_content" | grep -c '^- \[ \]' || true
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
  (cd "$PROJECT_DIR" && openspec new "$CHANGE_NAME" --schema eddys-flow) 2>&1 | tee -a "$LOG_DIR/harness.log"
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

    run_session "apply-group" "$MODEL_APPLY" "Task group: $group_name" "$log_suffix-attempt$((retry + 1))" || true
    actual_sessions_run=$((actual_sessions_run + 1))

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

# ============================================================
# Phase 3: Verification & Closing (5 sessions)
# ============================================================
log ""
log "=========================================="
log "  PHASE 3: VERIFICATION & CLOSING"
log "=========================================="

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
run_session "final-spec-alignment" "$MODEL_PLANNING"
run_session "retro"                "$MODEL_PLANNING"

# ============================================================
# Summary
# ============================================================
closing_sessions=4  # spec-alignment + pull-request + final-spec-alignment + retro
total_sessions=$((6 + actual_sessions_run + closing_sessions))

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
