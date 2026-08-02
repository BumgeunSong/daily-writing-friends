---
name: commit
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*)
description: Use when creating git commits in this project
---

# Git Commit

## Context

- Current git status: !`git status`
- Current git diff (staged and unstaged changes): !`git diff HEAD`
- Current branch: !`git branch --show-current`
- Recent commits: !`git log --oneline -10`

## Commit Rules

### Size

**Small logical steps forward.** Each commit = one feature, one fix, or one refactor.

**Never mix types in a single commit.** One commit has exactly one type (`feat` OR `fix` OR `refactor` OR ...) — do not bundle a feature and a refactor, or a fix and unrelated chore, together. If the staged changes span multiple types, split them into separate commits, staging each set with `git add <paths>` before its own commit.

### Message Format

```
<type>: <concise title in Korean>

- WHY point 1
- WHY point 2
```

- **Type**: Conventional type prefix — **required** (enforced by the `commit-msg` hook)
  - `feat` new feature · `fix` bug fix · `refactor` behavior-preserving change
  - `chore` tooling/deps · `docs` · `test` · `style` · `perf` · `ci` · `build` · `revert`
  - Optional scope: `feat(auth): ...`. Optional breaking marker: `feat!: ...`
- **Title**: Concise Korean summary after the prefix (50 chars max)
- **Body**: 1-3 bullet points explaining **WHY** we made this change (not WHAT changed)

### No AI Signatures

Never include:
- `Generated with [Claude Code]`
- `Co-Authored-By: Claude`
- Any emoji or AI branding

### Good vs Bad Examples

```
# BAD - missing type prefix + describes WHAT changed (obvious from diff)
토큰 사용량 추적 버그 수정

- Changed modelUsage.tokens to usage.input_tokens
- Added try-catch block

# GOOD - type prefix + explains WHY we made changes
fix: 토큰 사용량 추적 버그 수정

- API response structure changed in v2, tokens now nested under modelUsage
- Fallback needed for backward compatibility with older API responses
```

## Your Task

Based on the above changes and rules, create a single git commit. Stage and commit using a single message. Do not use any other tools or send any text besides the tool calls.
