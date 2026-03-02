# Verification Config — daily-writing-friends

This file defines the tool choices for the verification workflow
described in VERIFICATION_WORKFLOW.md.
Update this file when tools change. The workflow document stays stable.

## Tool Stack

| Role | Tool |
|------|------|
| Unit + Integration test runner | Vitest |
| Frontend framework | React + Vite |
| E2E browser automation | agent-browser |
| Dev timeline capture | dev3000 |
| Local DB | Supabase (local Docker) |
