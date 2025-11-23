Streak Recovery System — Requirements Document

1. Project Overview

A simplified Streak Recovery system for a social writing app that lets authors recover a missed working day via clearly defined rules and a 3-state model (onStreak, eligible, missed).
Calendar rule (v1): Only weekend (Saturday–Sunday, KST) is non-working; no holidays are considered.
Timezone: All logic and deadlines use Asia/Seoul (KST).
Key behaviors: Optimistic streak display during working days, explicit recovery windows, and deterministic midnight transitions.

⸻

2. Glossary

Author (User)
: A registered app user who writes posts. Synonyms: user, writer. Must be authenticated to create posts.

Working Day
: Monday–Friday in Asia/Seoul (KST). Only weekends (Sat–Sun) are non-working in v1.

Post / Posting
: A published writing entry created by an author in users/{userId}/postings/{postingId}. Edits/deletes do not retroactively change streaks.

Streak
: Count of consecutive working days with ≥1 post per day (KST semantics).

Optimistic Streak Display
: Before the user posts on a working day, display continues to show yesterday’s streak; after posting, immediately reflect today’s increment.

StreakInfo
: User’s streak state and counters stored at users/{userId}/streakInfo/current.

Status (RecoveryStatus)
: One of onStreak, eligible, missed. For eligible, it also includes postsRequired, currentPosts, deadline, missedDate.

originalStreak
: The streak value captured at the moment of onStreak → eligible (pre-miss). It does not increment daily; it is used only to compute restoration on successful recovery, and is cleared when recovery fails (eligible → missed).

Recovery
: A rule-bound process to restore a missed working day.
: Miss Mon–Thu → 2 posts on next working day.
: Miss Friday → 1 post on Saturday only (no Sunday).

Midnight Function
: A scheduled job at 00:00 KST that applies time-based transitions and deadlines.

Recovery History
: Audit records of recovery attempts/outcomes at users/{userId}/streakInfo/current/recoveryHistory/{recoveryId}.

⸻

3. Functional Requirements

IDs follow REQ-###. Each has Acceptance Criteria in Gherkin.

REQ-001: Working Day Determination (KST)
• Description: Classify a date as Working vs Non-Working using KST. Working = Mon–Fri; Non-Working = Sat–Sun. No holidays in v1.

Acceptance Criteria

Given a UTC timestamp
When it is converted to KST and classified
Then Monday–Friday is Working and Saturday–Sunday is Non-Working

⸻

REQ-002: Post Counting Scope
• Description: A “post” is any published post created via the normal composer; edits/deletes do not adjust past streak counts. Drafts/scheduled do not count until actually published.

Acceptance Criteria

Given a published post created today
Then it is eligible to count for today’s streak or recovery progress

Given a post is edited or deleted later
Then prior streak counts remain unchanged

⸻

REQ-003: Daily Streak Rule
• Description: On a Working Day, ≥1 post satisfies that day’s streak requirement. Additional posts the same day are used only for recovery progress (not extra streak increments).

Acceptance Criteria

Given today is a Working Day and the user posts once
Then today's streak requirement is satisfied

Given the user posts additional times today
Then the streak for today remains satisfied
And additional posts count only toward recovery progress if applicable

⸻

REQ-004: Optimistic Display
• Description: Before a user posts on a Working Day, display yesterday’s streak; after the first post, immediately display today’s incremented streak.

Acceptance Criteria

Given today is a Working Day and the user has not posted
Then the UI shows yesterday’s streak value

Given the user posts today
Then the UI immediately reflects the increment including today

⸻

REQ-005: Recovery Opportunity After Miss (Mon–Thu)
• Description: If the user misses a Working Day (Mon–Thu), the next Working Day becomes eligible with postsRequired = 2 and a deadline at 23:59:59 KST that day.

Acceptance Criteria

Given the user missed Wednesday
When it becomes Thursday 00:00 KST
Then status becomes eligible with postsRequired = 2 and deadline = Thu 23:59:59 KST

⸻

REQ-006: Friday Miss → Saturday Recovery
• Description: If the user misses Friday, Saturday only is eligible with postsRequired = 1 and a deadline at Saturday 23:59:59 KST. Sunday does not apply.

Acceptance Criteria

Given the user missed Friday
When it becomes Saturday 00:00 KST
Then status becomes eligible with postsRequired = 1 and deadline = Sat 23:59:59 KST

⸻

REQ-007: originalStreak Capture & Use
• Description: At onStreak → eligible, capture originalStreak = currentStreak. Do not increment originalStreak during normal days. On recovery success, compute restoration from originalStreak.

Acceptance Criteria

Given onStreak → eligible occurs
Then originalStreak is set to the currentStreak value at that moment

Given subsequent normal onStreak days
Then originalStreak does not change

⸻

REQ-008: Eligible Progress & Partial Streak
• Description: While eligible, increment progress on each post. The currentStreak must show the actual count of posts made since the miss (e.g., first post sets currentStreak = 1, second post sets currentStreak = 2) to reflect real-time progress before recovery completes.

Acceptance Criteria

Given status is eligible with postsRequired = 2
When the user posts once
Then status remains eligible and currentPosts = 1
And currentStreak must equal 1 (showing actual progress count)

⸻

REQ-009: Completing Recovery (Policy v2)
• Description: When currentPosts >= postsRequired within the deadline:
• Working day recovery (Mon–Thu miss → next working day): set currentStreak = originalStreak + 2 and status = onStreak. The +2 represents “recovered missed day (+1)” and “the recovery day itself (+1)”.
• Friday miss → Saturday recovery: set currentStreak = originalStreak + 1 and status = onStreak.
• On successful recovery, originalStreak is updated to match the new currentStreak (so future misses capture the elevated baseline).

Acceptance Criteria

Given eligible with postsRequired = 2 on a Working Day
When the second post is created before the deadline
Then status becomes onStreak and currentStreak = originalStreak + 2

Given eligible with postsRequired = 1 on Saturday
When one post is created before the deadline
Then status becomes onStreak and currentStreak = originalStreak + 1

⸻

REQ-010: Failing Recovery → missed (Partial Carry)
• Description: If the deadline passes without meeting postsRequired, set status = missed. Preserve partial daily progress into currentStreak if any (e.g., 1), and clear originalStreak to 0.

Acceptance Criteria

Given eligible with postsRequired = 2 and only 1 post made by deadline
When it becomes 00:00 KST
Then status becomes missed
And currentStreak reflects partial progress (e.g., 1)
And originalStreak = 0

⸻

REQ-011: Building New Streak After missed (Two Paths)
• Description: After missed: 1. Same-day two-post path: First post sets status to eligible (progress), second post (same day) flips to onStreak and restores streak as per REQ-009. If day ends with 0–1 post, status stays/returns missed. 2. Across-days path: If the user posts on consecutive working days, once currentStreak ≥ 2 the system flips missed → onStreak.

Acceptance Criteria

Given status is missed
When the user posts once today
Then status becomes eligible with currentPosts = 1

Given the same day the user posts a second time
Then status becomes onStreak per the applicable recovery rule

Given the day ends with only 0–1 post after missed
Then status is missed

Given the user posts again on the next Working Day and currentStreak ≥ 2 overall
Then status becomes onStreak

⸻

REQ-012: Multiple Consecutive Misses
• Description: Only the most recent missed day can be recovered; earlier misses become permanently unrecoverable breaks. When tracking switches to a new missed day while already eligible, the previous miss is considered a permanent streak break, and originalStreak should be updated to reflect only the progress built since that break.

Acceptance Criteria

Given two consecutive missed Working Days
Then only the most recent missed day is considered for any recovery opportunity
And the previous missed day becomes a permanent break

Given status is eligible for day X recovery with currentStreak = n
When day Y is also missed (consecutive miss)
Then status updates to track day Y recovery
And originalStreak = n (progress built since day X)
And currentStreak = 0 (reset for new miss)

⸻

REQ-013: Single StreakInfo Document
• Description: Maintain exactly one StreakInfo doc per user at users/{userId}/streakInfo/current.

Acceptance Criteria

Given a user
Then there exists at most one document at users/{userId}/streakInfo/current

⸻

REQ-014: Data Model — StreakInfo & RecoveryHistory
• Description: Store fields with these shapes:

// StreakInfo (users/{userId}/streakInfo/current)
interface StreakInfo {
lastContributionDate: string; // YYYY-MM-DD (KST)
lastCalculated: Timestamp;
status: {
type: 'onStreak' | 'eligible' | 'missed';
postsRequired?: number;
currentPosts?: number;
deadline?: Timestamp;
missedDate?: Timestamp;
};
currentStreak: number;
longestStreak: number;
originalStreak: number; // captured at onStreak→eligible; used only for recovery
}

// RecoveryHistory (users/{userId}/streakInfo/current/recoveryHistory/{recoveryId})
interface RecoveryHistory {
missedDate: Timestamp;
recoveryDate: Timestamp;
postsRequired: number;
postsWritten: number;
recoveredAt: Timestamp;
}

Acceptance Criteria

Given a streak transition occurs
Then StreakInfo fields are updated consistently
And on successful recovery a RecoveryHistory record is written

⸻

REQ-015: Triggers & Processing
• Description: Use both:
• Firestore onCreate of users/{userId}/postings/{postingId} for posting transitions.
• Midnight 00:00 KST scheduled job for time-based transitions.

Acceptance Criteria

Given a new post is created
Then the onCreate handler evaluates and applies posting transitions

Given it is 00:00 KST
Then the scheduled job evaluates and applies midnight transitions

⸻

REQ-016: Idempotency & Concurrency Policy
• Description: Reprocessing is best-effort (may double count if retried). For concurrency bursts, use transactions/atomic increments to avoid over/under-counting within a day.

Acceptance Criteria

Given the same post triggers the handler twice
Then behavior is best-effort and may not be strictly idempotent

Given multiple posts arrive in rapid succession
Then transaction-based increments are used to maintain accurate counters

⸻

REQ-017: Timestamps & Cutoffs
• Description: Use server-side creation timestamps. Posts at 00:00:00 KST count for the new day (≥00:00:00 is new day).

Acceptance Criteria

Given a post created at exactly 00:00:00 KST
Then it counts toward the new day

⸻

REQ-018: Longest Streak
• Description: Update longestStreak whenever currentStreak exceeds its previous max (update timing left to implementation as long as value is correct).

Acceptance Criteria

Given currentStreak increases beyond longestStreak
Then longestStreak is updated to currentStreak

⸻

Visual Model — State Flow (condensed)

flowchart TD
%% Midnight transitions
A[onStreak]
B[eligible]
C[missed]

A -->|Missed previous Working Day at 00:00 KST| B
A -->|Posted previous Working Day at 00:00 KST| A
B -->|Deadline passed (not met)| C

%% Posting transitions (same day)
C -->|1st post today| B
B -->|progress < required| B
B -->|met on Working Day (2 posts)| A
B -->|met on Saturday (1 post, Friday miss)| A

%% Across days (building back)
C -->|Post across days; when currentStreak ≥ 2| A

⸻

4. Non-Functional Requirements

NFR-01 Performance
: Streak display should feel immediate after posting; keep reads minimal.

NFR-02 Testability
: Date/time logic must be unit-testable with controllable “now” and mocked Timestamps.

NFR-03 Reliability
: Midnight job should be safe to re-run within a window without corrupting state; retries permitted.

NFR-04 Security
: Users can read their own StreakInfo; only privileged backend functions may update it. RecoveryHistory is read-restricted.

NFR-05 Observability
: Log recovery completions and state transitions with correlation to user and dates.

NFR-06 Maintainability
: Code organized to separate posting handler and midnight scheduler; clear pure functions for calendar logic.

⸻

5. Business & Domain Rules

BDR-01: Multi-Condition Decision Table (Recovery Windows)

Missed Day Recovery Day Allowed? postsRequired On Success currentStreak Notes
Mon–Thu Next Working Yes 2 originalStreak + 2 Deadline: 23:59:59 KST (recovery must occur the next working day only)
Friday Saturday Yes 1 originalStreak + 1 Saturday only (no Sunday)
Friday Sunday No — — Not allowed

BDR-02: Only Most-Recent Miss Recoverable

Earlier missed days are forfeited; no chained recoveries. When a new miss occurs while already eligible, the previous miss becomes a permanent break and originalStreak is updated to the progress built since that break.

BDR-03: Partial Progress Carry on Failure

If deadline passes with partial progress, currentStreak may carry partial value (e.g., 1) while status = missed and originalStreak = 0.

BDR-04: Two Paths to Regain onStreak After missed
• Two posts in the same day (first → eligible, second → onStreak); or
• Post across days until currentStreak ≥ 2, then flip to onStreak.

BDR-05: Counting Rule Within a Day

Only the first post satisfies the day’s streak; any additional posts the same day count only toward recovery progress.

⸻

6. Acceptance Criteria (End-to-End Scenarios)

TC-01 — Weekday Miss, Two-Post Recovery (Thu after Wed miss, +2)

Given the user missed Wednesday (Working Day) with originalStreak = 5
When it becomes Thursday 00:00 KST
Then status becomes eligible with postsRequired = 2 and deadline = Thu 23:59:59

When the user posts once on Thursday
Then currentPosts = 1 and currentStreak = 1 and status remains eligible

When the user posts a second time on Thursday
Then status becomes onStreak and currentStreak = originalStreak + 2 = 7

TC-02 — Friday Miss, Saturday Recovery (+1)

Given the user missed Friday with originalStreak = 5
When it becomes Saturday 00:00 KST
Then status becomes eligible with postsRequired = 1 and deadline = Sat 23:59:59

When the user posts once on Saturday
Then status becomes onStreak and currentStreak = originalStreak + 1 = 6

TC-03 — Recovery Failure with Partial Carry

Given eligible with postsRequired = 2 and only 1 post made by the deadline
When it becomes 00:00 KST
Then status becomes missed
And currentStreak = 1
And originalStreak = 0

TC-04 — Building Across Days After missed

Given status is missed and currentStreak = 1 from partial carry
When the user posts on the next Working Day
Then currentStreak becomes ≥ 2
And status becomes onStreak

TC-05 — Same-Day Two-Post Return After missed

Given status is missed at the start of the day
When the user posts once
Then status becomes eligible with currentPosts = 1

When the user posts a second time the same day
Then status becomes onStreak per the applicable rule

TC-06 — Optimistic Display

Given today is a Working Day and the user has not posted
Then the UI shows yesterday’s streak value

When the user posts today
Then the UI shows today’s increment immediately

TC-07 — Midnight Cutoff

Given a post created at exactly 00:00:00 KST
Then it counts for the new day

TC-08 — Consecutive Misses (REQ-012)

Given the user is eligible for Monday recovery with currentStreak = 1 from Tuesday post
When Wednesday is also missed without recovery
Then status updates to track Wednesday recovery
And originalStreak = 1 (progress from Tuesday)
And currentStreak = 0 (reset for new miss)
And Monday miss becomes permanently unrecoverable

⸻

7. Traceability Matrix

Req ID User Story Design Doc Test Case
REQ-001 US-01 DOC-Calendar TC-07
REQ-02 US-02 DOC-PostingRules TC-06
REQ-003 US-03 DOC-PostingRules TC-06
REQ-004 US-04 DOC-UI-Streak TC-06
REQ-005 US-05 DOC-RecoveryWeekday TC-01, TC-03
REQ-006 US-06 DOC-RecoveryFriday TC-02
REQ-007 US-07 DOC-StreakModel TC-01, TC-02
REQ-008 US-07 DOC-StreakModel TC-01
REQ-009 US-05/06/07 DOC-RecoveryCore TC-01, TC-02
REQ-010 US-08 DOC-RecoveryCore TC-03
REQ-011 US-09 DOC-RecoveryCore TC-04, TC-05
REQ-012 US-10 DOC-Policy (Add TC)
REQ-013 US-11 DOC-DataModel (Add TC)
REQ-014 US-11 DOC-DataModel TC-01..05
REQ-015 US-12 DOC-Architecture TC-01..07
REQ-016 US-13 DOC-Architecture (Add TC)
REQ-017 US-01 DOC-Calendar TC-07
REQ-018 US-14 DOC-StreakModel (Add TC)

User Stories (US) — Summary
• US-01: As a developer, I need deterministic KST calendar rules.
• US-02: As an author, I want clear, fair post counting.
• US-03: As an author, one post per working day should satisfy the day.
• US-04: As an author, I want optimistic streak display.
• US-05: As an author, if I miss Mon–Thu I can recover next working day with two posts.
• US-06: As an author, if I miss Friday I can recover on Saturday with one post.
• US-07: As a developer, I need captured originalStreak semantics for recovery.
• US-08: As an operator, I need predictable failure behavior with partial carry.
• US-09: As an author, after missed I want paths to regain onStreak.
• US-10: As a product owner, only the latest miss should be recoverable.
• US-11: As a developer, I need a single canonical StreakInfo per user and RecoveryHistory.
• US-12: As a developer, I need posting and midnight triggers.
• US-13: As an engineer, I need concurrency safety while accepting best-effort reprocessing.
• US-14: As an author, I want my longest streak tracked.

⸻

8. Version History

Version Date Author Changes
1.0 2025-08-06 Eddy Song Initial complete requirements (v1, no holidays; Saturday-only recovery)
1.1 2025-08-07 Eddy Song Updated REQ-008, REQ-009, REQ-012 to reflect finalized recovery policies: - Unified recovery formula: originalStreak + 1 (both weekday and Friday) - Consecutive miss handling with originalStreak reset - Partial progress visibility in currentStreak
