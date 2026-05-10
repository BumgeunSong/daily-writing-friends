## Review Summary

**Status**: Ready (with risks tracked into design.md)
**Iteration**: 1 of max 2

Three of four reviewers returned "Needs Revision"; one returned "Ready." All "Needs Revision" findings split cleanly into two buckets: (a) framing-level concerns about the proposal itself (BREAKING label, surfaced risks) — addressed by editing proposal.md in this iteration; (b) HOW-level concerns (UX text, lockout flow, tab semantics, spike on Supabase auto-link) — these belong in design.md and are tracked there. No second iteration was needed because no Critical finding survived the framing edits.

## Findings

### Critical

**1. `verifyOtp({ type: 'signup' })` for auto-link (Persona B) is unverified** — *scope-analyst*
The design assumes that calling `verifyOtp` on an already-registered email's OTP token will link the new password identity to the existing Google identity. Supabase's auto-linking happens at signup time, not at OTP verification time; if `signUp` returns `already_registered`, no OTP may have been sent. **Resolution:** Add a verification spike as task 0 in tasks.md; surfaced in proposal.md "Risks" section.

**2. OTP rate-limit lockout state is unspecified** — *user-advocate*
Repeated wrong entries trigger Supabase's default rate limit. Resend doesn't bypass lockout. Without a defined Korean error message and recovery hint, support tickets will spike. **Resolution:** Belongs in design.md (`VerifyEmailPage` error states section).

**3. Persona B auto-link is invisible to the user** — *user-advocate*
Users don't know their email/password account merged with their Google account. Worse, on a future signup attempt from a different device they'll hit `already_registered` with no explanation. **Resolution:** design.md adds an explicit success banner ("이미 등록된 구글 계정과 연결되었습니다") on first /verify-email success when prior identity existed.

**4. Manual dashboard step has no safety net** — *scope-analyst*
If the production Supabase email template isn't flipped before deploy, signup breaks silently. **Resolution:** proposal.md surfaces this as a deploy-checklist item; design.md will spec a startup self-check (or release-gate task) that verifies the email-template type by sending a probe signup against a sentinel address.

### Important

**5. Phone/Kakao tab data loss ambiguity** — *user-advocate*
Spec says "switching tabs clears the inactive field's form state on submit." Ambiguous whether the clear is at submit-time or tab-switch-time. **Resolution:** design.md will state explicitly: tab switch only hides the inactive input; the inactive value is *retained in form state* and only zeroed on submit (when the inactive tab's value is sent as `null`).

**6. Section 6 of source design still references "나중에 하기"** — *user-advocate*
Locked-in decision is to drop it; the source design doc has stale text. **Resolution:** noted in proposal.md "Risks" section; design.md will explicitly drop it and not include the link.

**7. Persona F /boards regression drops "신청 완료" feedback** — *user-advocate*
Returning waiting-list users used to see `JoinCompletePage` inline at `/`; now they go straight to `/boards`. The page gives no indication of waiting-list status. **Resolution:** design.md will add a small banner or empty-state on `/boards` for waiting/no-cohort users, OR document this as out-of-scope (decision goes in design).

**8. E2E tests don't cover OTP flow** — *scope-analyst*
Existing E2E logs in via password REST. Switching to OTP doesn't break login but leaves the new signup-to-onboarding journey uncovered. **Resolution:** tasks.md will list adding a smoke E2E for new-email signup using Supabase's local Inbucket inbox to read the OTP.

**9. CHECK constraint vs. seed/admin scripts** — *scope-analyst*
`users_contact_required_when_onboarded` blocks any UPDATE that sets `onboarding_complete = true` without contact info. **Resolution:** design.md migration spec will state: backfill UPDATE sets `onboarding_complete = true` *only* for rows where contact already exists (the criterion already covers this). Seed/admin scripts must comply.

**10. Race window between migration and deploy** — *scope-analyst*
Users who sign up between migration apply and code deploy still hit old magic-link flow; on next login they land on `/join/onboarding`. **Resolution:** documented in proposal.md "Accepted trade-offs."

**11. "BREAKING" label was misleading** — *objectives-challenger*
No external consumer is broken; it's a UX change. **Resolution:** label removed from proposal.md.

**12. Bundling OTP + onboarding + Kakao ID into one PR** — *objectives-challenger*
Three separable concerns. **Resolution:** author already locked in single-PR; trade-off documented.

### Minor

**13. Backfill never collects `kakao_id` for pre-existing users** — *user-advocate*
Tracked as follow-up in proposal.md.

**14. No upcoming cohort UX gives users no context on `/boards`** — *user-advocate*
Out of scope; logged.

**15. Hidden objective: retroactive data collection** — *objectives-challenger*
The proposal's "Why" is honest; this is a side effect, not a hidden goal.

**16. `/join/form` reference in `UserSettingPage` and `IntroCTA`** — *scope-analyst*
Already resolved in proposal: keep the route name `/join/form`, rename only the *component* to `JoinDispatcher`. Both callers continue to navigate to `/join/form`.

**17. `resolveRootRedirect` `joinComplete` return type removal** — *scope-analyst*
Routing-decision unit tests must be updated. Tracked in tasks.md.

## Key Questions Raised

- Does Supabase's `verifyOtp({ type: 'signup' })` actually link a password identity to an existing Google identity, or does the linking happen at signup time only? (Spike task 0.)
- Should the production deploy use a smoke test that confirms email-template type before code goes live? (Mitigation TBD in design.md.)
- For Persona F, is silently routing to `/boards` an improvement (no nag) or a regression (no feedback)? (Open in design.md.)

## Alternatives Considered

- **RootRedirect-only fix (no new `/join/onboarding`)**: Rejected. Existing `JoinFormCardForNewUser` is cohort-only and would need rebuild anyway.
- **Magic-link with OTP fallback dual mode**: Rejected. Users blocked by corporate gateways need OTP; non-corporate users handle OTP fine. Doubles UI surface for no gain.
- **Phone-only first; defer `kakao_id`**: Considered. Trade-off: simpler PR vs. blocked users who refuse to share phone. Author kept Kakao ID in scope.
- **Infer `onboarding_complete` from `phone_number IS NOT NULL`**: Considered. Equivalent technically; the explicit boolean is marginally clearer for future schema evolution. Author kept the column.

## Accepted Trade-offs

- Single PR (large blast radius); rollback is the entire feature.
- One-time UX glitch in the migration→deploy race window.
- Pre-existing users never collect `kakao_id`; organizer follow-up tracked.
- Persona F sees `/boards` instead of inline `JoinCompletePage`. Final UX decision deferred to design.md (banner vs. silent).

## Revision History

- **Round 1 (2026-05-05)**: Initial review by 4 reviewers (objectives-challenger, alternatives-explorer, user-advocate, scope-analyst). 3 of 4 said "Needs Revision."

  Edits applied to proposal.md:
  - Removed misleading "BREAKING" label on OTP item.
  - Added "Risks surfaced during proposal review" subsection in Impact (auto-link spike, dashboard step, OTP lockout, Persona B notice, Section 6 stale reference).
  - Added "Accepted trade-offs" subsection (single PR, race window, Kakao ID follow-up).

  Stop condition: No new Critical finding survives in the proposal-level framing. Remaining Criticals are HOW-level (lockout text, auto-link UX, dashboard guard) and will be resolved in design.md.

- **Round 2**: Skipped per skill rule (no Critical issues remaining at proposal-framing level).
