Retroactive Streak Backfill — Requirements Document

1. Project Overview

Goal. Recompute a user’s streak state retroactively from historical postings to produce the correct final values for
status (RecoveryStatus), currentStreak, longestStreak, and originalStreak, and write them to users/{userId}/streakInfo/current.
This job simulates the live rules day-by-day using Asia/Seoul (KST) semantics.

Scope.
• Invocation: Per-user via HTTP Firebase Cloud Function (admin-only).
• Horizon: Simulate up to “now” (current KST time), including today’s partial progress.
• Calendar: Weekend-only (Sat–Sun) are non-working days. No holidays.
• Data Source: users/{userId}/postings/\* (server-side creation timestamps only).
• Throughput: ≤ 500 postings per user; process in batches (e.g., 200) within one function run.
• Write Targets: Overwrite StreakInfo/current; rebuild RecoveryHistory deterministically, unless dryRun=true.

⸻

2. Glossary

Backfill Job
: The HTTP function that reconstructs streak state from historical postings for a single user.

As-Of Horizon
: The simulation end instant. Here, “now” in KST (includes today’s partial progress).

Event
: A posting occurrence extracted from postings, using server-side creation timestamp, converted to KST.

Daily Bucket
: All events falling within the same KST calendar day (00:00:00–23:59:59.999).

Working Day
: Monday–Friday in KST (no holidays considered).

Non-Working Day
: Saturday–Sunday in KST.

Recovery Window
: The eligible day for restoring a miss (Mon–Thu miss → next working day requires 2 posts; Friday miss → Saturday only, 1 post).

Determinism
: For the same input dataset and parameters, the job produces bit-for-bit identical outputs (including recovery IDs).

Dry-Run
: Mode that does not write to Firestore; returns a JSON preview of computed final state and history.

recoveryId
: Deterministic ID for a recovery record, computed as a hash of {missedDate, recoveryDate}.

⸻

3. Functional Requirements

IDs use REQ-###. Each includes Acceptance Criteria in Gherkin.
Visual models provided for complex logic.

REQ-101: HTTP Trigger, Auth, and Parameters
• Description: Provide an HTTP Cloud Function requiring admin-only access (Firebase Auth token with custom claim).
Params: userId (required), asOf (optional KST date/time; default = now KST), from (optional start date), dryRun (optional boolean, default false).

Acceptance Criteria

Given a request with a valid admin token and userId
When the HTTP function is invoked
Then it authorizes successfully and begins backfill

Given dryRun=true
When the function completes
Then no Firestore writes occur and the response body contains the computed results

⸻

REQ-102: Event Extraction & Ordering
• Description: Extract events from users/{userId}/postings/\* using server-side creation timestamps, convert to KST, sort ascending, and stream in batches (e.g., 200) up to the As-Of Horizon.

Acceptance Criteria

Given a user with ≤500 postings
When events are extracted
Then they are ordered ascending by KST timestamp and processed in batches without omission

⸻

REQ-103: KST Day Boundaries & Calendar
• Description: ≥ 00:00:00 KST is a new day. Weekend only are non-working days. Saturday posts do not satisfy streak but may count toward Friday recovery.

Acceptance Criteria

Given a post at exactly 00:00:00 KST
Then it belongs to the new day

Given a post on Saturday
Then it cannot satisfy the daily streak (non-working) but may apply to Friday recovery progress

⸻

REQ-104: Simulation Window & Start Point
• Description: Simulate from the earliest post (or from if provided) through the As-Of Horizon (default: now KST).

Acceptance Criteria

Given no 'from' parameter
Then simulation starts at the earliest posting date

Given 'from' is provided
Then simulation starts from that date inclusive

⸻

REQ-105: Daily Bucketing & First-Post Rule
• Description: Group events by KST day. On a working day, the first post satisfies the day’s streak; additional posts are recovery-only counts.

Acceptance Criteria

Given multiple posts on a working day
Then only the first post satisfies the daily streak and the remainder contribute only to recovery progress

⸻

REQ-106: Recovery Semantics
• Description:
• Mon–Thu miss → next working day becomes eligible with postsRequired=2, deadline 23:59:59 KST that day.
• Friday miss → Saturday only becomes eligible with postsRequired=1, deadline Saturday 23:59:59 KST.
• Only the most recent missed day is recoverable (no chained recoveries).

Acceptance Criteria

Given a missed Wednesday
Then Thursday is eligible with postsRequired=2 and deadline Thursday 23:59:59 KST

Given a missed Friday
Then Saturday is eligible with postsRequired=1 and deadline Saturday 23:59:59 KST

Given consecutive missed days
Then only the most recent miss is considered for recovery

⸻

REQ-107: Eligible Progress, Failure Carry, and originalStreak
• Description:
• On onStreak → eligible, capture originalStreak = currentStreak. originalStreak does not increment daily thereafter.
• During eligible, progress increases with posts; partial progress may reflect in currentStreak (e.g., 1).
• If deadline passes unmet, set status=missed, carry partial (currentStreak=1 if one post made), and set originalStreak=0.

Acceptance Criteria

Given onStreak transitions to eligible
Then originalStreak equals currentStreak at that moment

Given eligible with postsRequired=2 and only 1 post by deadline
Then status becomes missed, currentStreak=1, originalStreak=0

⸻

REQ-108: Completing Recovery & Same-Day Return Path
• Description:
• If currentPosts >= postsRequired within deadline:
• Working day recovery → currentStreak = originalStreak + 1, status=onStreak.
• Saturday (Friday miss) → currentStreak = originalStreak, status=onStreak.
• After missed, same day 2 posts path: 1st post → eligible, 2nd post → onStreak (apply rule above).
• After missed, across days path: when currentStreak ≥ 2, flip missed → onStreak.

Acceptance Criteria

Given eligible (2 required) on a working day and 2 posts before deadline
Then currentStreak = originalStreak + 1 and status=onStreak

Given Friday miss and 1 Saturday post
Then currentStreak = originalStreak and status=onStreak

⸻

REQ-109: Longest Streak Computation
• Description: Track and update longestStreak whenever currentStreak exceeds the previous max during simulation.

Acceptance Criteria

Given currentStreak increases beyond longestStreak
Then longestStreak updates to match currentStreak

⸻

REQ-110: RecoveryHistory Rebuild
• Description: Delete all existing recoveryHistory/\* for the user and recreate deterministically for the simulated period. recoveryId = hash(missedDate, recoveryDate).

Acceptance Criteria

Given existing recoveryHistory records
When backfill runs (non-dryRun)
Then all records are deleted and re-created deterministically with stable recoveryIds

⸻

REQ-111: Writes, Dry-Run, and Response
• Description:
• Dry-Run: No writes; return JSON:

{
"userId": "...",
"from": "YYYY-MM-DD",
"asOf": "YYYY-MM-DDTHH:mm:ssKST",
"finalState": { "status": "...", "currentStreak": n, "longestStreak": n, "originalStreak": n },
"recoveryEvents": [ { "missedDate": "...", "recoveryDate": "...", "postsRequired": n, "postsWritten": n } ],
"stats": { "postsProcessed": n, "daysSimulated": n, "recoveries": n, "batches": n }
}

    •	Write Mode: Perform a single transaction to update streakInfo/current and batched writes to recoveryHistory.

Acceptance Criteria

Given dryRun=true
Then the function returns the JSON body with finalState and no Firestore writes

Given dryRun=false
Then streakInfo/current and recoveryHistory are updated atomically/batched

⸻

REQ-112: Determinism, Idempotency, and Live Conflicts
• Description: Outputs must be bit-for-bit deterministic for the same inputs and parameters. If the live system writes concurrently, last-write-wins; backfill does not disable live handlers.

Acceptance Criteria

Given two consecutive runs with identical inputs and parameters
Then the outputs including recoveryIds are identical

Given a live write occurs during backfill
Then whichever write completes last persists (last-write-wins)

⸻

REQ-113: Limits, Runtime, and Region
• Description: Process up to 500 posts; batch internally (e.g., 200). Use default region/timeout unless platform constraints require adjustment.

Acceptance Criteria

Given 500 postings
Then the function completes within a single invocation using batching without exceeding limits

⸻

Visual Models

Simulation Pipeline

flowchart TD
A[HTTP Request (userId, asOf?, from?, dryRun?)] --> B[Auth: Admin Token]
B --> C[Extract Postings (server ts) -> KST]
C --> D[Sort Ascending & Batch (200)]
D --> E[Daily Buckets by KST]
E --> F[Iterate Days -> Apply Streak/Recovery Rules]
F --> G[Compute final status, currentStreak, originalStreak, longestStreak]
G --> H{dryRun?}
H -- Yes --> I[Return JSON Preview]
H -- No --> J[Tx: Write StreakInfo/current; Batch: recoveryHistory]
J --> K[Return JSON Result]

Day/Recovery Decision (Excerpt)

flowchart TD
S[Start Day d] --> W{Working Day?}
W -- No (Sat/Sun) --> N[No streak satisfaction; only Friday-recovery on Sat]
W -- Yes --> P{Any posts?}
P -- Yes --> ST[First post satisfies streak; extras -> recovery-only]
P -- No --> M[Missed day -> may create eligible for next day per rules]

⸻

4. Non-Functional Requirements

NFR-01 Performance
: Process ≤500 posts with in-memory simulation and batched reads/writes; target single invocation completion.

NFR-02 Determinism
: Identical inputs/params produce identical outputs and recovery IDs.

NFR-03 Idempotency
: Safe to re-run; results converge to the same final state.

NFR-04 Testability
: Calendar, bucketing, and transition logic exposed as pure functions; emulator tests cover Firestore I/O.

NFR-05 Security
: Admin-only HTTP; function uses Admin SDK; clients cannot write streakInfo/current or recoveryHistory.

NFR-06 Observability
: Structured logs per phase (extraction, simulation, write) with counts/timings.

NFR-07 Reliability
: Transaction for streakInfo/current; batch writes for history; retries safe.

⸻

5. Business & Domain Rules

BDR-01: Day Classification & Counting

Day Type Satisfy Daily Streak? Post Usage
Mon–Thu Yes (first post only) First post → streak; extras → recovery-only
Friday Yes (first post only) First post → streak; extras → recovery-only
Saturday No Recovery-only for Friday miss
Sunday No No effect

BDR-02: Recovery Windows

Missed Day Eligible Day postsRequired Deadline (KST) On Success currentStreak
Mon–Thu Next Working 2 That day 23:59:59 originalStreak + 1
Friday Saturday 1 Saturday 23:59:59 originalStreak (no bonus)

BDR-03: Multiple Misses

Only the most recent miss can be recovered; prior misses are forfeited.

BDR-04: Failure Carry

If deadline passes with 1/2 progress, set status=missed, carry currentStreak=1, and originalStreak=0.

⸻

6. Acceptance Criteria (End-to-End)

TC-101 — No Posts → Missed/Zeroes

Given a user with zero postings
When backfill runs
Then final status = missed and currentStreak = 0 and longestStreak = 0 and originalStreak = 0

TC-102 — Continuous Streak (e.g., 130 Days)

Given 130 consecutive working-day posts without misses
When backfill runs to now KST
Then final status = onStreak and currentStreak ≥ 130 and longestStreak ≥ 130

TC-103 — Friday Miss, Saturday Recovery

Given the user missed Friday
And posts once on Saturday
When backfill runs
Then status becomes onStreak with currentStreak = originalStreak

TC-104 — Weekday Miss, Next-Day 2 Posts

Given the user missed Tuesday
And on Wednesday posts twice before 23:59:59 KST
When backfill runs
Then status = onStreak and currentStreak = originalStreak + 1

TC-105 — Eligible Failure with Partial Carry

Given eligible with postsRequired=2
And only one post before the deadline
When backfill runs past the deadline
Then status = missed and currentStreak = 1 and originalStreak = 0

TC-106 — Dry-Run Response

Given dryRun=true
When backfill completes
Then it returns a JSON body including userId, horizon, finalState, recoveryEvents[], and stats
And it performs no Firestore writes

TC-107 — Deterministic Rerun

Given two runs with the same postings and parameters
When both complete
Then both finalState and recoveryHistory (including recoveryIds) are identical

TC-108 — Boundary Timestamps

Given a post at 00:00:00 KST
Then it counts for the new day

Given a post at 23:59:59.999 KST
Then it counts for the same day

TC-109 — Saturday Posts Do Not Satisfy Streak

Given a Saturday with posts
When evaluated
Then daily streak is not satisfied by Saturday posts
And Saturday posts may count toward Friday recovery only

TC-110 — Ignore Edits/Deletes

Given postings reflect only currently existing docs
When backfill runs
Then it does not attempt to reconstruct deleted/edited history

TC-111 — Batching

Given 500 postings
When backfill runs
Then events are processed in ascending KST order using batches without loss

TC-112 — Live Conflict Last-Write-Wins

Given a live transition writes to streakInfo during backfill
When both writes complete
Then the last write determines the final stored state

⸻

7. Traceability Matrix

Req ID User Story Design Doc Test Case
REQ-101 US-21 DOC-Backfill-API TC-106
REQ-102 US-22 DOC-Event-Extract TC-111
REQ-103 US-23 DOC-Calendar TC-108, TC-109
REQ-104 US-24 DOC-SimulationWindow TC-106
REQ-105 US-25 DOC-Bucketing TC-109
REQ-106 US-26 DOC-RecoveryRules TC-103, TC-104
REQ-107 US-27 DOC-StreakModel TC-105
REQ-108 US-27 DOC-StreakModel TC-103, TC-104
REQ-109 US-28 DOC-StreakCounters TC-102
REQ-110 US-29 DOC-RecoveryHistory TC-107
REQ-111 US-21/29 DOC-Backfill-API TC-106, TC-107
REQ-112 US-30 DOC-Determinism TC-107, TC-112
REQ-113 US-31 DOC-Perf-Limits TC-111

User Stories (summary)
• US-21: As an admin, I need a secure HTTP backfill with dry-run preview.
• US-22: As an engineer, I need deterministic event extraction and ordering.
• US-23: As an engineer, I need KST calendar/day-boundary rules.
• US-24: As an operator, I need clear start/stop horizons.
• US-25: As an engineer, I need daily bucketing with first-post rules.
• US-26: As a product owner, I need weekday and Friday/Saturday recovery semantics.
• US-27: As an engineer, I need correct originalStreak, eligible progress, and failure carry.
• US-28: As an author, my longestStreak should reflect true maxima.
• US-29: As an operator, I need a clean, deterministic RecoveryHistory.
• US-30: As an engineer, I need deterministic, idempotent reruns under live load.
• US-31: As an engineer, I need safe batching for up to 500 postings.

⸻

8. Version History

Version Date Author Changes
1.0 2025-08-06 Eddy Song Initial retroactive backfill requirements (admin HTTP, KST)
