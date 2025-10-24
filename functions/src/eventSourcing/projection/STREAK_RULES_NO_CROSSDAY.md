# Streak System Rules - Phase 2.1 No-Crossday (v1)

## Overview

This document describes the simplified streak system that removes cross-day rebuild logic. The system now focuses on **same-day recovery** only, making the rules clearer and eliminating the most complex piece of logic.

**Version**: `phase2.1-no-crossday-v1`
**Date**: 2025-10-24

## Core Principles

1. **Virtual Day Close**: No persisted DAY_CLOSED events. Instead, we synthesize:
   - `DAY_ACTIVITY {dayKey, postsCount}` - for closed working days with ≥1 posts
   - `DAY_CLOSED_VIRTUAL {dayKey}` - for closed working days with 0 posts

2. **Optimistic Evaluation**:
   - If user posted today → evaluate up to today (immediate feedback)
   - If user hasn't posted today → evaluate only up to yesterday (give them time)

3. **Same-Day Recovery Only**: No cross-day rebuild. Posts on separate days don't accumulate.

## State Machine

```
onStreak → [miss working day] → eligible → [recovery rules] → onStreak or missed
                                                            ↓
                                missed → [same-day 2 posts] → onStreak
```

## Recovery Rules

### From `onStreak` Status

When a user misses a working day (0 posts):
- **Weekday miss (Mon-Thu)**: Enter `eligible` with `postsRequired = 2`, recovery deadline = next working day
- **Friday miss**: Enter `eligible` with `postsRequired = 1`, recovery deadline = Saturday

### From `eligible` Status (On Recovery Day)

When on the recovery day:
- **2+ posts**: Restore streak with increment
  - Weekday miss: `currentStreak = originalStreak + 2`
  - Friday miss: `currentStreak = originalStreak + 1`
- **Exactly 1 post**: Start over → `onStreak` with `currentStreak = 1`
- **0 posts**: Fall to `missed` with `currentStreak = 0`

### From `missed` Status

When user posts from missed state:
- **First post on working day**: Enter `eligible` (same-day recovery attempt)
  - `postsRequired = 2` (weekday semantics)
  - `deadline = end of today`
- **Second post same day**: Restore → `onStreak` with `currentStreak = 2`
- **Day closes with only 1 post**: Start over → `onStreak` with `currentStreak = 1`

## Event Handlers

### `handlePostCreated(state, event)`

Real-time behavior when user creates a post:
- **If `onStreak`**: No change (already in good standing)
- **If `eligible`**:
  - Increment `currentPosts`
  - If `currentPosts >= postsRequired` → restore streak with appropriate increment
- **If `missed`**:
  - First post → enter `eligible` (same-day recovery)
  - Second+ post same day → restore with `currentStreak = 2`

### `handleDayActivity(state, event)`

Synthetic event for extension window (when evaluating days after cache):
- **If `eligible` on recovery day**:
  - Add `postsCount` to `currentPosts`
  - If `currentPosts >= postsRequired` → restore streak
  - Otherwise, defer to day close logic
- **If `missed`**:
  - If `postsCount >= 2` → restore with `currentStreak = 2`
  - If `postsCount == 1` → enter `eligible` (will close to onStreak(1))
- **If `onStreak`**: No change

### `handleDayClosedVirtual(state, event)`

Handles working day close (with 0 posts):
- **If `onStreak` and no posts**: Enter `eligible`
- **If `eligible` on recovery day close**:
  - `currentPosts >= postsRequired`: Already restored (no-op)
  - `currentPosts > 0`: Start over with `onStreak(1)`
  - `currentPosts == 0`: Fall to `missed(0)`

## Key Changes from Previous Version

### Removed
- ❌ `missedPostDates` array tracking
- ❌ `hasConsecutiveWorkingDays()` function
- ❌ `calculateRestoredStreak()` function
- ❌ Cross-day rebuild logic (2+ consecutive working days)

### Added
- ✅ `DAY_CLOSED_VIRTUAL` event type
- ✅ Same-day recovery with "start over" path (1 post → streak = 1)
- ✅ Simplified eligible → missed transition
- ✅ Clear rules for Friday vs weekday misses

## Examples

### Example 1: Weekday Miss with Full Recovery

```
Day 1 (Mon): onStreak(5), 1 post
Day 2 (Tue): onStreak(6), 1 post
Day 3 (Wed): onStreak(7), 0 posts → eligible (originalStreak=7, postsRequired=2, deadline=Thu)
Day 4 (Thu): eligible, 2 posts → onStreak(9)  [restored with +2]
```

### Example 2: Weekday Miss with Partial Recovery

```
Day 1 (Mon): onStreak(5), 1 post
Day 2 (Tue): onStreak(6), 1 post
Day 3 (Wed): onStreak(7), 0 posts → eligible (originalStreak=7, postsRequired=2, deadline=Thu)
Day 4 (Thu): eligible, 1 post → onStreak(1)  [start over with 1]
```

### Example 3: Friday Miss

```
Day 1 (Thu): onStreak(5), 1 post
Day 2 (Fri): onStreak(6), 0 posts → eligible (originalStreak=6, postsRequired=1, deadline=Sat)
Day 3 (Sat): eligible, 1 post → onStreak(7)  [restored with +1]
```

### Example 4: Missed → Same-Day Rebuild

```
Day 1: missed(0), 0 posts
Day 2: missed(0), 1 post → eligible (same-day recovery, postsRequired=2)
Day 2: eligible, 2nd post → onStreak(2)  [restored with +2]
```

### Example 5: Missed → Start Over

```
Day 1: missed(0), 0 posts
Day 2: missed(0), 1 post → eligible (same-day recovery)
Day 2: day closes → onStreak(1)  [start over with 1 post]
```

## Non-Goals

These behaviors are **NOT** supported in this version:

❌ Posts on separate days (e.g., Wed + Fri) don't accumulate for recovery
❌ Multi-day rebuild trails
❌ Carrying partial progress across multiple days
❌ Weekend-initiated recovery windows

## Rollout Notes

- **Version bump**: `projectorVersion = 'phase2.1-no-crossday-v1'`
- **No data migration required**: Pure logic change
- **Cache invalidation**: Automatic via version check
- **Nightly warmup**: Runs at 00:05 KST to precompute with new rules

## For Maintainers

When debugging streak issues, check:

1. **Version**: Is cache using `'phase2.1-no-crossday-v1'`?
2. **Same-day posts**: Are 2+ posts counted correctly via `postsPerDay` map?
3. **Recovery day**: Is eligible checking `dayKey === deadlineDayKey`?
4. **Extension ticks**: Are `DAY_ACTIVITY` and `DAY_CLOSED_VIRTUAL` generated correctly?

For detailed implementation, see:
- `streakReducerPhase2.ts` - Pure reducer logic
- `computeStreakProjection.ts` - Orchestrator with extension ticks
- `Event.ts` - Event type definitions
