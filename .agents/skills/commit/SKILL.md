---
name: commit
description: Use when creating git commits in this project. Enforces small single-type commits, a conventional type prefix, and Korean commit messages.
---

# Git Commit

## Context

Before committing, inspect:

- `git status`
- `git diff HEAD` (staged and unstaged changes)
- `git branch --show-current`
- `git log --oneline -10` (to match recent style)

## Commit Rules

### Size

**Small logical steps forward.** Each commit = one feature, one fix, or one refactor.

**Never mix types in a single commit.** One commit has exactly one type (`feat` OR `fix` OR `refactor` OR ...) — do not bundle a feature and a refactor, or a fix and unrelated chore, together. If the staged changes span multiple types, split them into separate commits, staging each set with `git add <paths>` before its own commit.

### Message Format

```
<type>: <concise title in Korean>

- WHY point 1 (in Korean)
- WHY point 2 (in Korean)
```

### Language

Write the commit message in **Korean**. Only the conventional type prefix (`feat`, `fix`, `chore`, ...) and optional scope stay in English. Code identifiers, file names, and commands inside the message may stay as-is.

- **Type**: Conventional type prefix — **required** (enforced by the `commit-msg` hook)
  - `feat` new feature · `fix` bug fix · `refactor` behavior-preserving change
  - `chore` tooling/deps · `docs` · `test` · `style` · `perf` · `ci` · `build` · `revert`
  - Optional scope: `feat(auth): ...`. Optional breaking marker: `feat!: ...`
- **Title**: Concise Korean summary after the prefix (50 chars max)
- **Body**: 1-3 Korean bullet points explaining **WHY** we made this change (not WHAT changed)

### No AI Signatures

Never include:
- Generated-by lines or `Co-Authored-By` trailers naming any AI tool
- Any emoji or AI branding

### Good vs Bad Examples

```
# BAD - missing type prefix + describes WHAT changed (obvious from diff)
토큰 사용량 추적 버그 수정

- modelUsage.tokens를 usage.input_tokens로 변경
- try-catch 블록 추가

# GOOD - type prefix + explains WHY we made changes
fix: 토큰 사용량 추적 버그 수정

- API v2부터 응답 구조가 바뀌어 토큰이 modelUsage 아래로 중첩됨
- 이전 버전 응답과의 하위 호환을 위해 폴백이 필요함
```

## Your Task

Based on the changes and rules above, stage the relevant files and create a single git commit with one message. Do not push unless asked.
