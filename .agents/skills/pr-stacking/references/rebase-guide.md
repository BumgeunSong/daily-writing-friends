# Rebasing Stacked PRs

Guide to handling rebases and conflicts in stacked branches.

## Why Rebase is Necessary

Stacked PRs are dependent branches. When a base branch changes, all dependent branches need to be updated to include those changes.

```
main ─────●─────●─────●
           \
            ● feat-1-model (base PR)
             \
              ● feat-2-api (depends on model)
               \
                ● feat-3-ui (depends on api)
```

When `feat-1-model` changes, `feat-2-api` and `feat-3-ui` must rebase.

## Basic Rebase Commands

### Rebase onto Parent Branch

```bash
git checkout feat-2-api
git rebase feat-1-model
```

### Rebase onto Main (after base PR merges)

```bash
git checkout feat-2-api
git rebase main
```

### Push After Rebase

```bash
# Always use --force-with-lease (not --force)
git push --force-with-lease
```

`--force-with-lease` is safer: it fails if someone else pushed changes you haven't fetched.

## Handling Conflicts

### When Conflicts Occur

```bash
$ git rebase feat-1-model
CONFLICT (content): Merge conflict in src/api/users.ts
error: could not apply abc123... Add user API
```

### Resolution Steps

```bash
# 1. See which files have conflicts
git status

# 2. Open conflicting files and resolve
#    Look for <<<<<<< ======= >>>>>>> markers

# 3. After resolving, stage the file
git add src/api/users.ts

# 4. Continue rebase
git rebase --continue

# 5. If more conflicts, repeat steps 2-4
```

### Aborting a Rebase

If things go wrong:

```bash
git rebase --abort
```

This returns you to the state before the rebase started.

## Rebasing Multiple Branches

When base PR changes, rebase the entire stack in order:

```bash
# 1. Update base branch (if it changed remotely)
git checkout feat-1-model
git pull origin feat-1-model

# 2. Rebase second branch onto first
git checkout feat-2-api
git rebase feat-1-model
git push --force-with-lease

# 3. Rebase third branch onto second
git checkout feat-3-ui
git rebase feat-2-api
git push --force-with-lease
```

Order matters: Always rebase from bottom of stack upward.

## Using --update-refs (Git 2.38+)

First, check your Git version:

```bash
git --version
# Needs 2.38 or later for --update-refs
```

### If Git 2.38+

Modern Git can update multiple branches in one rebase:

```bash
git checkout feat-3-ui
git rebase --update-refs feat-1-model
```

This updates all branch pointers in the stack automatically.

### If Older Than Git 2.38

Rebase each branch manually from bottom to top:

```bash
# Rebase each branch in order
git checkout feat-2-api
git rebase feat-1-model
git push --force-with-lease

git checkout feat-3-ui
git rebase feat-2-api
git push --force-with-lease
```

To upgrade Git:
```bash
# macOS
brew upgrade git

# Ubuntu/Debian
sudo add-apt-repository ppa:git-core/ppa
sudo apt update && sudo apt install git
```

## Interactive Rebase for Cleanup

Before merging, clean up commits within a stacked PR:

```bash
# Rebase last 3 commits interactively
git rebase -i HEAD~3
```

In the editor:
```
pick abc123 Add user model
squash def456 Fix typo in user model
squash ghi789 Add missing field
```

Result: Three commits become one clean commit.

## Conflict Prevention Strategies

### 1. Keep PRs Small and Focused

Smaller changes = fewer potential conflicts.

### 2. Avoid Overlapping Changes

If two stacked PRs touch the same file section, conflicts are likely. Structure your stack to minimize overlap.

### 3. Rebase Frequently

Don't let branches drift. Rebase after every change to base PR.

### 4. Communicate with Team

If working with others, coordinate who's rebasing when to avoid duplicate work.

## Common Rebase Scenarios

### Scenario: Base PR Merged to Main

```bash
# 1. Update main
git checkout main
git pull

# 2. Rebase dependent PR onto main
git checkout feat-2-api
git rebase main
git push --force-with-lease

# 3. Change PR base branch in GitHub UI:
#    - Open the PR page on GitHub
#    - Click "Edit" button next to the base branch selector (top of PR)
#    - Select "main" as the new base branch
#    - Confirm the change
```

### Scenario: Conflict in the Middle of Stack

```bash
# Rebase fails on feat-2-api
git checkout feat-2-api
git rebase feat-1-model
# CONFLICT!

# Resolve conflicts
git add <resolved-files>
git rebase --continue
git push --force-with-lease

# Now rebase the rest of the stack
git checkout feat-3-ui
git rebase feat-2-api
git push --force-with-lease
```

### Scenario: Need to Squash Before Merge

```bash
# On your stacked branch
git rebase -i main

# In editor, mark commits to squash:
pick abc123 Add feature part 1
squash def456 Add feature part 2
squash ghi789 Fix tests

# Save, edit commit message
git push --force-with-lease
```

## Quick Reference

| Command | Purpose |
|---------|---------|
| `git rebase <base>` | Rebase current branch onto base |
| `git rebase --continue` | Continue after resolving conflicts |
| `git rebase --abort` | Cancel rebase, return to original state |
| `git rebase -i HEAD~N` | Interactive rebase for cleanup |
| `git push --force-with-lease` | Safe force push after rebase |
| `git rebase --update-refs` | Update multiple branches at once |
