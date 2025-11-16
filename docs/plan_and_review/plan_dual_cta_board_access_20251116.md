# Feature Plan: Dual CTA for Board Access
**Date:** 2025-11-16
**Status:** READY_FOR_REVIEW

## Overview
Add a secondary CTA button for logged-in users to access the board list directly without requiring cohort form submission. This provides users with flexibility to explore existing boards while still encouraging cohort participation through the primary CTA.

## User Story
**As a** logged-in user
**I want to** access the board list directly from the intro page
**So that** I can browse content without being forced to submit the next cohort form

## Current Behavior
- Single CTA button that changes behavior based on user state
- Logged-in users who are in waiting list see "게시판 보기" and can navigate to boards
- Logged-in users NOT in waiting list must submit cohort form to proceed
- No way to access boards without form submission for non-waiting-list users

## Desired Behavior
- **All users** (logged-in and non-logged-in) see TWO buttons:
  - **Left (Secondary):** "게시판 들어가기" - navigates to `/boards` (weak/ghost style)
    - Non-logged-in users: Triggers login flow via route protection
    - Logged-in users: Direct access to board list
  - **Right (Primary):** Existing CTA behavior - cohort form submission (accent/cta style)
- Waiting list users see adjusted messaging

## Implementation Plan (Git Commit Steps)

### Phase 1: Add dual button layout to IntroCTA component
- **Scope:** Refactor IntroCTA to support two-button layout when user is logged in
- **Files:**
  - `src/login/components/IntroCTA.tsx`
- **Key Changes:**
  - Add conditional rendering for dual vs single button layout
  - Create secondary button with ghost variant linking to `/boards`
  - Keep primary button with existing CTA variant and behavior
  - Adjust button text logic for logged-in state
  - Update layout to flex container with gap when showing two buttons
  - Maintain responsive design and fixed footer positioning
  - **Responsive behavior:** Horizontal layout on all screen sizes with appropriate gap spacing

### Phase 2: Update button text and messaging for dual CTA context
- **Scope:** Refine button labels and status messages to work with dual button layout
- **Files:**
  - `src/login/components/IntroCTA.tsx`
- **Key Changes:**
  - Update primary button text to focus on cohort registration (e.g., "N기 시작하기")
  - Set secondary button text to "게시판 들어가기"
  - Adjust status messages to work with dual button context
  - Remove or adjust "게시판 보기" logic since it's now secondary button
  - Ensure messaging is clear about the difference between the two actions

## Design Decisions

### 1. Button Styling: Ghost vs Outline variant for secondary CTA
**Decision:** Use `ghost` variant for secondary button
**Rationale:**
- Creates clear visual hierarchy (ghost is more subtle than outline)
- Matches shadcn/ui design patterns for secondary actions
- Maintains accessibility while being less prominent than primary CTA
**Alternative considered:** `outline` variant - more visible but potentially competes with primary CTA

### 2. Button Positioning: Left-Right vs Stacked
**Decision:** Horizontal layout with secondary on left, primary on right
**Rationale:**
- F-pattern reading (left to right) makes right side more prominent for primary action
- Maintains existing single-button layout width for visual consistency
- Mobile-friendly with flex wrap if needed
**Alternative considered:** Stacked layout - takes more vertical space in fixed footer

### 3. Route Target: `/boards` vs `/boards/list`
**Decision:** Use `/boards` route
**Rationale:**
- Matches existing navigation pattern in codebase (see IntroCTA.tsx:40)
- Route is auth-protected via PrivateRoutes wrapper
- Provides consistent user experience with existing "게시판 보기" functionality
**Verification:** ✅ Route confirmed to exist at `src/router.tsx:94` and is properly protected

### 4. Visibility Logic: Always show for logged-in vs conditional
**Decision:** Show secondary button for ALL logged-in users
**Rationale:**
- Provides consistent escape hatch regardless of waiting list status
- Simplifies logic and user mental model
- User specified "if user is already logged in"
**Alternative considered:** Only show for non-waiting-list users - but this limits flexibility

## Testing Strategy
**Business Logic Tests:** Not applicable - this is purely UI/navigation logic with no complex business rules
**Manual Testing Required:**
- Verify visual hierarchy (ghost vs cta variants)
- Test responsive behavior on mobile devices
- Confirm button text readability and clarity
- Test navigation to `/boards` route works correctly for logged-in users

## Pre-Implementation Verification
- ✅ Route `/boards` exists and is auth-protected (verified at src/router.tsx:94)
- ✅ Button variants `ghost` and `cta` exist in design system (verified at src/shared/ui/button.tsx)
- ✅ Korean button text confirmed: "게시판 들어가기"

## Implementation Status

### Phase 1: ✅ COMPLETED
**Commit-ready:** Yes
**Files Modified:** `src/login/components/IntroCTA.tsx`
**Changes:**
- Added dual button layout with flex container and gap-3 spacing
- Implemented conditional rendering based on `isLoggedIn` state
- Created secondary button (ghost variant) navigating to `/boards`
- Maintained primary button (cta variant) with existing behavior
- Both buttons use `flex-1` for equal width distribution
- Separated click handlers: `handlePrimaryClick()` and `handleSecondaryClick()`
- Updated disabled state logic for dual button context

### Phase 2: ✅ COMPLETED
**Commit-ready:** Yes (merged with Phase 1)
**Files Modified:** `src/login/components/IntroCTA.tsx`
**Changes:**
- Renamed `getButtonText()` to `getPrimaryButtonText()` for clarity
- Set secondary button text to "게시판 들어가기" (line 60)
- Simplified logic by removing `showBoardsAccess`
- Status message logic updated to work with dual button context

### Phase 3: ✅ COMPLETED
**Commit-ready:** Yes (merged with Phases 1 & 2)
**Files Modified:** `src/login/components/IntroCTA.tsx`
**Changes:**
- Removed conditional rendering - dual buttons now always shown for all users
- Removed `showDualButtons` variable
- Secondary button leverages route protection for non-logged-in users
- Simplified component structure by eliminating single/dual button branching logic

## Current Status
**Overall Status:** READY_FOR_REVIEW
**Commit Message Suggestion:**
```
Add dual CTA buttons for all users to access boards

- Show secondary "게시판 들어가기" button (ghost variant) for all users
- Secondary button navigates to /boards route (triggers login for non-authenticated users)
- Primary CTA button maintains cohort registration behavior
- Ghost button follows BUTTON_SYSTEM.md pattern (transparent hover, no accent color)
- Both buttons use equal width (flex-1) in horizontal layout

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Next Steps:**
1. Manual testing with logged-in and non-logged-in states
2. Verify responsive behavior on mobile devices
3. Test navigation to `/boards` route
4. Create git commit when approved
