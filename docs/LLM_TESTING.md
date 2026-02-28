# LLM Testing Workflow

## Overview

The app uses Google OAuth in production, which blocks automated browser testing. To enable LLM-driven testing via Playwright MCP, we use local Supabase with email/password authentication.

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

- **Blank page after login**: Check `.env.local` has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- **Auth fails**: The seed script does **not** create any Supabase Auth users. Create a test user via Supabase Dashboard (Auth > Users > Add user) or CLI with the same `id` as a user in the `users` table, and credentials matching your tests (e.g. `test@test.local` / `test1234`)
- **No data**: Ensure `supabase/seed.sql` exists and has INSERT statements

## Architecture Notes

- All reads and writes go directly to Supabase (Firestore migration complete)
- Authentication uses Supabase Auth (Google OAuth in production, email/password locally)
- Local Supabase client auto-detects localhost and enables session persistence
