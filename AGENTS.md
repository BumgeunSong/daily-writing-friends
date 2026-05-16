# AGENTS.md

Project-wide context for AI coding agents. Facts only — no instructions or how-to guides.

## Project Overview

**Daily Writing Friends** — A React web app for daily writing habits in a cohort-based community.

| Component | Technology | Location |
|-----------|------------|----------|
| Web App | React 18, Vite, TypeScript | `apps/web/` |
| Admin App | Next.js, TypeScript | `apps/admin/` |
| Edge Functions | Deno, TypeScript | `supabase/functions/` |
| Cloud Functions (legacy) | Node 22, TypeScript | `functions/` |
| Database | Supabase (Postgres) | — |
| Auth | Supabase Auth (Google OAuth) | — |
| Storage | Firebase Storage | — |
| Styling | Tailwind CSS 3.x | — |
| State | React Query (web: v4, admin: v5) | — |
| Testing | Vitest (web), Jest (functions) | — |
| Package Manager | pnpm 9.x (monorepo) | `pnpm-workspace.yaml` |

## Monorepo Structure

```
apps/
├── web/                # Main user-facing app (Vite + React)
│   └── src/
│       ├── <feature>/  # board, comment, draft, login, notification, post, stats, user
│       │   ├── api/
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── model/
│       │   └── utils/
│       ├── shared/     # Cross-feature code
│       │   ├── api/    # Supabase client, reads, writes
│       │   ├── components/
│       │   ├── contexts/
│       │   ├── hooks/
│       │   ├── lib/    # queryClient
│       │   ├── model/  # Shared types (Timestamp, etc.)
│       │   ├── ui/     # shadcn/ui components
│       │   └── utils/
│       ├── firebase/   # Firebase config (Storage only)
│       └── firebase.ts # Firebase init (Storage, Analytics, Performance)
├── admin/              # Admin dashboard (Next.js)
└── mcp/                # MCP server tools
supabase/
├── functions/          # Deno edge functions (notifications, etc.)
├── migrations/         # SQL migrations
└── config.toml
functions/              # Legacy Firebase Cloud Functions (mostly removed)
```

## Path Aliases (apps/web)

```typescript
import { Component } from '@/shared/components/Component';
import { useHook } from '@board/hooks/useHook';
import { Post } from '@post/model/Post';
// Available: @/, @board/, @post/, @comment/, @draft/, @notification/, @user/, @shared/, @login/, @stats/
```

## Database

Supabase Postgres with RLS. Key tables: `users`, `boards`, `posts`, `comments`, `replies`, `likes`, `reactions`, `blocks`, `notifications`, `drafts`, `user_board_permissions`, `board_waiting_users`.

User IDs are Supabase Auth UUIDs. RLS policies use `auth.uid()`.

## Auth

Supabase Auth with Google OAuth. No Firebase Auth dependency remains. Client uses anon key with auth session.

## Environment Variables

Web app requires:
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — Supabase connection
- `VITE_FIREBASE_*` — Firebase Storage config
- `SENTRY_AUTH_TOKEN` (optional) — Error tracking

Admin app requires:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase connection
- `SUPABASE_SERVICE_ROLE_KEY` — Server-only admin access

## Commands

All commands run from repository root.

| Command | What it does |
|---------|-------------|
| `pnpm install` | Install all workspace dependencies |
| `pnpm --filter web dev` | Start web dev server |
| `pnpm --filter web build` | Production build (web) |
| `pnpm --filter web type-check` | TypeScript check (web) |
| `pnpm --filter web lint` | Lint (web) |
| `pnpm --filter web test:run` | Run tests once (web, Vitest) |
| `pnpm --filter web test` | Run tests in watch mode (web) |
| `pnpm --filter admin build` | Production build (admin) |
| `cd functions && npm test` | Run legacy Cloud Functions tests (Jest) |
| `npx tsx scripts/...` | Run TypeScript scripts (ESM — use `tsx`, not `ts-node`) |

## Configuration Files

| File | Purpose |
|------|---------|
| `pnpm-workspace.yaml` | Monorepo workspace definition |
| `tsconfig.json` | TypeScript config with path aliases (apps/web) |
| `vite.config.ts` | Vite build config, path aliases, Vitest (apps/web) |
| `tailwind.config.js` | Tailwind CSS configuration |
| `supabase/config.toml` | Supabase local dev config |

## Skills

`.claude/skills/` contains project-specific coding conventions. Each skill auto-loads via its frontmatter trigger.

| Skill | Domain |
|-------|--------|
| `api-layer` | Data fetchers, API functions, list-fetching hooks (N+1 prevention) |
| `react-component` | `.tsx` component structure |
| `react-hook` | Custom hook patterns, exhaustive-deps |
| `firebase-functions` | Cloud Functions in `/functions` |
| `daily-writing-friends-design` | UI / Tailwind conventions |
| `testing` | TDD, output-based test patterns |
| `refactoring` | Functional Core / Imperative Shell extraction |
| `type-system` | Type safety reviews |
| `verify-runtime` | Verifying data-flow changes via dev logs |
| `code-style` | Naming and clarity rules |

## Related Docs

- [Authentication & Routing](./docs/AUTHENTICATION_ROUTING.md)
- [Design Theme](./docs/DESIGN_THEME.md)
- [Migration Progress](./docs/plan_and_review/migration_progress.md)
