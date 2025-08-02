# Legacy Code Cleanup - Recovery Status System

## Overview

This document tracks the cleanup of legacy streak recovery logic that was replaced with the new PRD specification.

## Deprecated Functions

### ❌ **`addStreakCalculations`** in `transitionHelpers.ts`
- **Status**: Deprecated, marked with `@deprecated`
- **Reason**: Replaced with simple arithmetic per new PRD
- **Old Logic**: Complex streak recalculation from database posts
- **New Logic**: Simple increment/decrement based on state transitions
- **Action**: Function kept for backward compatibility but logs deprecation warning

### ❌ **`calculateRestoredStreak`** in `transitionHelpers.ts`
- **Status**: Deprecated, marked with `@deprecated` 
- **Reason**: Replaced with inline if/else logic in `calculateEligibleToOnStreak`
- **Old Logic**: `originalStreak + (isWorkingDay ? 1 : 0)`
- **New Logic**: Direct assignment with working day check
- **Action**: Function kept for backward compatibility but logs deprecation warning

### ❌ **`calculateMidnightStreakUpdate`** in `stateTransitions.ts`
- **Status**: Deprecated, marked with `@deprecated`
- **Reason**: Replaced with specific midnight functions per new PRD
- **Old Logic**: Complex recalculation from user posting history
- **New Logic**: 
  - `calculateMidnightStreakMaintenance` for onStreak users
  - `calculateMissedStateMaintenance` for missed users
- **Action**: Function kept for backward compatibility but returns null

## Deprecated Test Files

### ❌ **`stateTransitions.behavior.legacy.test.ts`** (616 lines)
- **Status**: Renamed from `stateTransitions.behavior.test.ts`, marked as legacy
- **Reason**: Tests old complex logic that no longer exists
- **Replacement**: `stateTransitions.newspec.test.ts` (focused on new PRD behavior)
- **Action**: File kept for reference but should not be run

## Still Used (Legacy but Required)

### ⚠️ **`calculateUserStreaks`** in `streakCalculations.ts`
- **Status**: Still used by migration script `scripts/initializeUserStreaks.ts`
- **Reason**: Needed for one-time data migration
- **Action**: Keep for now, consider removing after migration is complete

## New Implementation Summary

The new implementation follows these principles:

1. **Simple Arithmetic**: No complex database queries for streak calculation
2. **Predictable Rules**: Clear state-based transitions per PRD
3. **Immediate Updates**: currentStreak changes immediately on state transitions
4. **Working Day Logic**: Weekend vs working day affects streak increments

### New Functions Added:
- `calculateMidnightStreakMaintenance` - Handle onStreak maintenance at midnight
- `calculateMissedStateMaintenance` - Ensure missed state has correct values
- Inline recovery logic in `calculateEligibleToOnStreak`

## Migration Impact

✅ **No Breaking Changes**: All deprecated functions kept for backward compatibility
✅ **Graceful Degradation**: Deprecated functions log warnings but don't break
✅ **Test Coverage**: New comprehensive test suite covers all PRD requirements

## Cleanup Timeline

1. **Phase 1** ✅ - Mark functions as deprecated with warnings
2. **Phase 2** ⏳ - Monitor production for any usage of deprecated functions  
3. **Phase 3** ⏳ - Remove deprecated functions after confirmation of no usage
4. **Phase 4** ⏳ - Remove legacy test file after new implementation proves stable

## Files Modified

- `transitionHelpers.ts` - Deprecated 2 functions, removed unused imports
- `stateTransitions.ts` - Deprecated 1 function, added new midnight logic
- `stateTransitions.behavior.legacy.test.ts` - Renamed and marked as legacy
- `LEGACY_CLEANUP.md` - This documentation file

## Performance Impact

✅ **Improved Performance**: Eliminated complex database queries for streak calculation
✅ **Reduced Function Calls**: Simple arithmetic vs. complex async operations  
✅ **Better Reliability**: Deterministic logic vs. database-dependent calculations