# LLM Testing Workflow

## Overview

The app normally uses Google OAuth, which blocks automated browser testing. To enable LLM-driven testing via Playwright MCP, we use local Supabase with email/password authentication.

This setup uses `VITE_READ_SOURCE=supabase` to read from local Supabase instead of Firestore, allowing Claude to interact with the app through automated browser testing.

## Prerequisites

- Supabase CLI installed (`brew install supabase/tap/supabase`)
- Node.js and npm
- Project dependencies installed (`npm install`)

## Setup

### 1. Start Local Supabase

```bash
npm run supabase:start
```

Note the anon key from the output.

### 2. Generate and Seed the Database

First, generate the seed file from production (requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`):

```bash
npm run supabase:seed:extract
```

This creates `supabase/seed.sql` with anonymized data. Then apply migrations and seed:

```bash
npm run supabase:reset
```

### 3. Configure Environment

Copy `config/.env.local.example` to `.env.local` at project root and fill in the anon key from step 1.

### 4. Start Dev Server

```bash
npm run dev
```

## Claude Testing Workflow

### Authentication

Claude authenticates via Playwright MCP's `browser_evaluate`:

```javascript
const { createClient } = await import('@supabase/supabase-js');
const sb = createClient('http://localhost:54321', '<anon-key>');
await sb.auth.signInWithPassword({ email: 'test@test.local', password: 'test1234' });
```

Then refresh the page - the app picks up the Supabase session.

### Browsing

After auth, Claude can navigate freely:
- Board list page shows seeded boards
- Click into a board to see posts
- Click a post to see comments and replies
- All read paths served from local Supabase

## Teardown

```bash
npm run supabase:stop
```

## Troubleshooting

- **Blank page after login**: Check `.env.local` has `VITE_READ_SOURCE=supabase`
- **Auth fails**: Run `supabase db reset` to recreate the auth user
- **No data**: Ensure `supabase/seed.sql` exists and has INSERT statements

## Architecture Notes

- Read source switching: `VITE_READ_SOURCE` env var controls whether reads go to Firestore or Supabase
- Local Supabase client auto-detects localhost and enables session persistence
- Production is unaffected: `VITE_READ_SOURCE` defaults to `firestore` when unset
- Write paths still use dual-write to Firestore (primary) + Supabase
