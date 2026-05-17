---
name: firebase-functions
description: Legacy Firebase Functions skill. Prefer Supabase Edge Functions in /supabase/functions; /functions no longer exists in this repository.
---

# Edge Function Patterns (Supabase)

## Current State

- Legacy Firebase Cloud Functions directory (`/functions`) is removed.
- Server-side runtime code lives in `supabase/functions/`.

## Directory Structure

```
supabase/functions/
├── create-notification/
│   └── index.ts
├── fairy-webhook/
│   ├── index.ts
│   └── _helpers.ts
└── _shared/
    └── notificationMessages.ts
```

## Function Structure

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const payload = await req.json();
  const { error } = await supabase.from('notifications').insert(payload);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ status: 'created' }), { status: 200 });
});
```

## Error Handling

Return explicit HTTP responses and log details with `console.error`.

```typescript
try {
  // ... work
  return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
} catch (error) {
  console.error('Function failure:', error);
  return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500 });
}
```

## Build & Test

```bash
supabase functions serve create-notification
deno test supabase/functions/tests
```
