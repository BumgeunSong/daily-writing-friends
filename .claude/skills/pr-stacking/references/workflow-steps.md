# PR Stacking Workflow - Step by Step

Detailed guide for creating and managing stacked PRs.

## Phase 1: Planning the Stack

Before coding, break the feature into logical chunks.

### Identify Natural Boundaries

Look for:
- **Data layer changes** (models, API endpoints)
- **Business logic** (utils, services)
- **UI components** (presentational)
- **Integration** (wiring everything together)

### Example: Adding User Notifications

```
Stack Plan:
1. PR #1: Add notification model and Firestore schema
2. PR #2: Create notification API functions
3. PR #3: Build notification list component
4. PR #4: Wire notifications to header with badge
```

### Stack Size Guidelines

| Stack Size | Recommendation |
|------------|----------------|
| 2-3 PRs | Ideal for most features |
| 4-5 PRs | Acceptable for complex features |
| 6+ PRs | Consider if feature can be split into separate releases |

## Phase 2: Creating the Stack

### Step 1: Start from Fresh Main

```bash
git checkout main
git pull origin main
```

### Step 2: Create Base Branch

```bash
git checkout -b feat/notifications-1-model
```

### Step 3: Implement and Commit

```bash
# Make changes...
git add src/notification/model/
git commit -m "Add Notification type and Firestore schema"
```

### Step 4: Push and Create PR

```bash
git push -u origin feat/notifications-1-model
```

Then create PR via GitHub web UI:
1. Go to repository on GitHub
2. Click "Compare & pull request" banner (or "New pull request")
3. Set base branch to `main`
4. Fill in title and description
5. Click "Create pull request"

### Step 5: Stack Next Branch

```bash
# Stay on current branch, create new branch from it
git checkout -b feat/notifications-2-api
```

### Step 6: Repeat for Each Layer

Continue creating branches, each building on the previous.

## Phase 3: Managing Reviews

### Keeping PRs in Sync

When reviewers request changes to base PR:

```bash
# 1. Make changes on base branch
git checkout feat/notifications-1-model
# ... make changes ...
git add . && git commit -m "Address review feedback"
git push

# 2. Rebase all dependent branches
git checkout feat/notifications-2-api
git rebase feat/notifications-1-model
git push --force-with-lease

git checkout feat/notifications-3-component
git rebase feat/notifications-2-api
git push --force-with-lease
```

### PR Description Template

```markdown
## Stack Position
This is PR **2 of 4** in the notifications feature stack.

| PR | Status | Description |
|----|--------|-------------|
| #101 | ✅ Merged | Notification model |
| #102 | 🔍 This PR | Notification API |
| #103 | ⏳ Waiting | Notification component |
| #104 | ⏳ Waiting | Header integration |

## Depends On
- #101 must be merged before this PR

## Changes
- Add `fetchNotifications()` API function
- Add `markAsRead()` mutation
- Add React Query hooks

## Test Plan
- [ ] Run `npm run test:run`
- [ ] Verify API calls in browser devtools
```

## Phase 4: Merging the Stack

### Merge Order

Always merge from bottom to top (base first).

### After Merging Base PR

```bash
# 1. Update main
git checkout main
git pull origin main

# 2. Rebase next PR onto main
git checkout feat/notifications-2-api
git rebase main
git push --force-with-lease

# 3. Update PR base branch in GitHub UI:
#    - Open the PR page
#    - Click "Edit" button next to base branch (top of PR)
#    - Select new base branch (e.g., "main")
#    - Confirm the change
```

### Squash vs. Merge Commit

| Strategy | When to Use |
|----------|-------------|
| Squash | Each stacked PR becomes one clean commit |
| Merge | Preserve individual commits within each PR |

Recommended: **Squash** for cleaner history.

## Common Scenarios

### Scenario: Reviewer Asks for Major Refactor in Base

1. Make the refactor in base PR
2. Rebase all dependent PRs (may have conflicts)
3. Resolve conflicts in each PR
4. Push all branches with `--force-with-lease`

### Scenario: Need to Insert PR in Middle of Stack

1. Create new branch from the PR it should follow
2. Rebase all subsequent PRs onto new branch
3. Update PR descriptions to reflect new order

### Scenario: Abandoning a Stacked PR

1. Merge/close the PRs before it
2. Rebase remaining PRs onto the new base
3. Update PR descriptions

## Tips for Success

1. **Keep PRs focused**: Each PR should do ONE thing well
2. **Write good PR descriptions**: Future you will thank you
3. **Communicate with reviewers**: Let them know it's a stack
4. **Rebase frequently**: Don't let branches drift too far
5. **Use `--force-with-lease`**: Safer than `--force`
