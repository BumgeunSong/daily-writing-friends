# MCP Server for DailyWritingFriends

> Design doc for [Issue #456](https://github.com/BumgeunSong/daily-writing-friends/issues/456)

## Goal

Let AI assistants (Claude, ChatGPT) read a user's previous DailyWritingFriends posts to help with future writing. Non-technical users should be able to connect with just a URL and their display name.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data source | Supabase (Postgres) | Migration nearly complete, SQL-friendly, simple auth model |
| User scope | Individual's own posts | Privacy-first; user reads their own writing history |
| Auth model | `authorName` in config | Non-technical users know their name, not Firebase UIDs |
| Deployment | Vercel (remote MCP) | Free tier, official MCP template, one URL serves both Claude and ChatGPT |
| Repo | Separate (`daily-writing-friends-mcp`) | No dependency on main React app |
| Search | `ILIKE` (no FTS setup) | ~4K posts, Korean is space-delimited, fast enough at this scale |

## Architecture

```
Claude / ChatGPT
        |
        v
  Vercel (Remote MCP Server)
  ┌─────────────────────┐
  │  MCP Layer          │  Tool definitions, input validation, response formatting
  │  (thin adapter)     │  Depends on @modelcontextprotocol/sdk
  ├─────────────────────┤
  │  App Layer          │  Pure functions: Supabase queries, user lookup, preview extraction
  │  (no MCP dependency)│  Could be reused for REST API later
  └─────────┬───────────┘
            v
     Supabase (Postgres)
     posts, users, boards
```

**Clean boundary**: MCP layer imports app layer, never the reverse. App layer has zero knowledge of MCP protocol.

## Tools (Progressive Disclosure)

### `get_my_posts` - Browse writing history

**Inputs:**
- `board` (optional) - filter by board title or cohort number
- `limit` (default 20)
- `offset` (default 0)

**Returns:** Array of post metadata:
```typescript
{
  id: string;
  title: string;
  preview: string;        // first 2-3 lines, ~200 chars
  boardTitle: string;
  createdAt: string;       // ISO date
  engagementScore: number;
}
```

### `get_post_content` - Read full post

**Inputs:**
- `postId` (required)

**Returns:**
```typescript
{
  id: string;
  title: string;
  content: string;         // full plain text
  boardTitle: string;
  authorName: string;
  createdAt: string;
  engagementScore: number;
}
```

### `get_best_posts` - High-signal posts in the group

**Inputs:**
- `board` (optional)
- `limit` (default 10)

**Returns:** Same metadata shape as `get_my_posts`.

### `search_posts` - Find posts by keyword

**Inputs:**
- `query` (required)
- `limit` (default 10)

**Returns:** Same metadata shape as `get_my_posts`.

## User Config (Claude Desktop example)

```json
{
  "mcpServers": {
    "daily-writing-friends": {
      "url": "https://daily-writing-friends-mcp.vercel.app/mcp",
      "config": {
        "authorName": "범근"
      }
    }
  }
}
```

ChatGPT: paste the same URL in Settings > Connectors.

## Preview Extraction

Take plain `content` field, split by newlines, take first 3 non-empty lines, truncate to ~200 chars. No ProseMirror JSON parsing needed on the server.

## User Lookup Flow

1. User provides `authorName` in config (e.g., "범근")
2. On first tool call, app layer queries `users` table: `WHERE real_name = $1 OR nickname = $1`
3. If exactly 1 match: cache `user_id` for session
4. If 0 or multiple matches: return error message asking user to clarify

## Project Structure

```
daily-writing-friends-mcp/
├── src/
│   ├── app/                  # App layer (pure business logic)
│   │   ├── queries.ts        # Supabase query functions
│   │   ├── user-lookup.ts    # authorName -> user_id resolution
│   │   └── preview.ts        # Content preview extraction
│   ├── mcp/                  # MCP layer (protocol adapter)
│   │   ├── server.ts         # MCP server setup + tool definitions
│   │   └── tools.ts          # Tool handlers (call app layer)
│   └── index.ts              # Vercel entry point
├── package.json
├── tsconfig.json
├── vercel.json
└── .env.example              # SUPABASE_URL, SUPABASE_ANON_KEY
```

## Environment Variables

```
SUPABASE_URL=https://mbnuuctaptbxytiiwxet.supabase.co
SUPABASE_ANON_KEY=<anon key>
```

Using `anon` key (not service role) since all reads are on public tables.

## Out of Scope (v1)

- Comments/reactions received on user's posts
- Other members' public posts (beyond best posts)
- Write operations (creating posts from AI)
- Real-time updates / streaming
- Full-text search index (ILIKE is sufficient at current scale)

## Implementation Steps

1. Create repo, init Node.js/TypeScript project
2. Implement app layer: Supabase client, queries, user lookup, preview extraction
3. Implement MCP layer: server setup, 4 tool definitions
4. Wire up Vercel entry point
5. Deploy to Vercel, test with Claude Desktop
6. Test with ChatGPT Connector
7. Write user setup guide (Korean)
