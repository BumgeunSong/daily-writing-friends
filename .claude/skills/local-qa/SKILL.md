---
name: local-qa
description: Use when testing the app end-to-end, verifying features in browser, dogfooding, or when asked to "QA locally", "test this feature", or "check if X works". Requires local Supabase (Docker) and agent-browser CLI.
---

# Local QA

Interactive QA against local Supabase using agent-browser. Full lifecycle: start services, seed, authenticate, explore, teardown.

## Checklist

Copy and track progress:

```
- [ ] Phase 1: Preflight (verify tools)
- [ ] Phase 2: Start Supabase + seed
- [ ] Phase 3: Create auth user + link to seed data
- [ ] Phase 4: Start dev server
- [ ] Phase 5: Authenticate via agent-browser
- [ ] Phase 6: QA session
- [ ] Phase 7: Teardown
```

## Phase 1: Preflight

```bash
command -v supabase && command -v agent-browser && command -v node
```

If missing: `brew install supabase/tap/supabase`, `npm install -g agent-browser`.

## Phase 2: Start Supabase + Seed

```bash
npm run supabase:start
```

Capture `anon key` and `service_role key` from output. If already running, get them from `supabase status`.

Then reset (applies migrations + seed):

```bash
npm run supabase:reset
```

## Phase 3: Create Auth User

This is the critical step. The seed inserts app users but NOT Supabase Auth users.

```bash
# 1. Create auth user — capture the UUID
AUTH_RESPONSE=$(curl -s -X POST 'http://localhost:54321/auth/v1/admin/users' \
  -H "Authorization: Bearer <service_role_key>" \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@test.local","password":"test1234","email_confirm":true}')

AUTH_UUID=$(echo "$AUTH_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Auth UUID: $AUTH_UUID"

# 2. Link auth user to seed data user
psql "postgresql://postgres:postgres@localhost:54322/postgres" \
  -c "UPDATE users SET id = '${AUTH_UUID}' WHERE email = 'test@test.local';"
```

**Success**: `AUTH_UUID` is a valid UUID and the UPDATE affects 1 row.

## Phase 4: Start Dev Server

Ensure `.env.local` exists with local values:
- `VITE_SUPABASE_URL=http://localhost:54321`
- `VITE_SUPABASE_ANON_KEY=<anon_key>`

```bash
npm run dev &
# Wait for ready
for i in {1..30}; do curl -s http://localhost:5173 > /dev/null && break; sleep 1; done
```

## Phase 5: Authenticate

```bash
agent-browser open http://localhost:5173 && agent-browser wait --load networkidle

agent-browser eval --stdin <<'EVALEOF'
const { createClient } = await import('@supabase/supabase-js');
const sb = createClient('http://localhost:54321', '<anon_key>');
const { data, error } = await sb.auth.signInWithPassword({
  email: 'test@test.local',
  password: 'test1234'
});
if (error) throw new Error('Auth failed: ' + error.message);
'Signed in as ' + data.user.email;
EVALEOF

# Reload to pick up session, then save state
agent-browser open http://localhost:5173 && agent-browser wait --load networkidle
agent-browser state save local-qa-auth.json
```

**Success**: Snapshot shows board list, not login page.

```bash
agent-browser snapshot -i
```

## Phase 6: QA Session

Explore freely. General pattern:

```bash
agent-browser snapshot -i          # See interactive elements
agent-browser click @eN            # Interact using refs
agent-browser wait --load networkidle
agent-browser snapshot -i          # Re-snapshot after navigation
agent-browser screenshot --annotate  # Evidence at key points
```

Always re-snapshot after navigation — refs are invalidated by page changes.

## Phase 7: Teardown

```bash
agent-browser close
pkill -f "vite" || true
npm run supabase:stop
```

## Resuming a Previous Session

```bash
agent-browser state load local-qa-auth.json
agent-browser open http://localhost:5173 && agent-browser wait --load networkidle
```

If expired, re-run Phase 5 only.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Blank page | Check `.env.local` has correct anon key |
| Auth fails | Re-run Phase 3. Check `supabase status` for keys |
| No data | `npm run supabase:reset` |
| Port 5173 in use | `pkill -f vite` then restart |
| RLS blocks queries | Auth UUID must match `users.id` — re-run Phase 3 |
