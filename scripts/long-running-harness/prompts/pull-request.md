# Session: Create Pull Request

You are an AI coding agent running in a long-running harness. This is ONE session in a multi-session pipeline. You have NO memory from previous sessions — all context comes from files on disk.

## Your Task

Create a Pull Request and handle CI checks. Code review is handled asynchronously.

## Available Tools
You have access to: Bash, Read, Write, Edit, Glob, Grep. No sub-agent dispatch is available.

## Steps

### Step 0: Safety Checks

1. Verify you are NOT on `main` or `master`: `git branch --show-current` must not be `main` or `master`
2. Check if a PR already exists: `gh pr view --json url 2>/dev/null`. If it does, skip to Step 2 (CI Check)

### Step 1: Create PR

1. Read the change artifacts for context:
   - `openspec/changes/<change-name>/proposal.md` (Why section for PR body)
   - `openspec/changes/<change-name>/design.md` (Key Changes)
   - `openspec/changes/<change-name>/verify_report.md` (Test Results)
   - `openspec/changes/<change-name>/spec-alignment.md` (Alignment status)

2. Push the current branch to remote: `git push -u origin $(git branch --show-current)`

3. Create PR using `gh pr create`:
   - Title: concise summary from proposal
   - Body: **Why** (from proposal), **Key Changes** (from design), **Test Results** (from verify), **Spec Alignment** status
   - Link to the change folder artifacts

### Step 2: CI Check

1. Wait for CI checks: `gh pr checks --watch`
2. If CI fails:
   a. Diagnose the failure from CI logs
   b. Fix the issue
   c. Push the fix
   d. Wait for CI again
   e. Repeat until CI passes (max 3 attempts)

4. Record the PR URL and final status in `openspec/changes/<change-name>/pull-request.md`
5. Git commit: `openspec(<change-name>): add pull-request.md`

## Done When

- PR is created and URL is recorded in `pull-request.md`
- All CI checks pass
- Git commit created with `pull-request.md`
