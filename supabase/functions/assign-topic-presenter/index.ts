import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface AssignPayload {
  board_id: string;
}

// Shape returned by the advance_topic_presenter Postgres RPC
interface AdvanceRpcRow {
  out_user_id: string;
  out_topic: string;
  out_user_name: string;
  out_wrapped: boolean;
}

serve(async (req) => {
  try {
    // 3.1: Verify service_role JWT — same pattern as create-notification.
    // --verify-jwt ensures a valid JWT; we additionally check the role claim
    // to reject end-user JWTs and prevent unauthorised queue advancement.
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    try {
      const claims = JSON.parse(atob(token.split('.')[1]));
      if (claims.role !== 'service_role') {
        return new Response('Forbidden', { status: 403 });
      }
    } catch {
      return new Response('Forbidden', { status: 403 });
    }

    const payload: AssignPayload = await req.json();

    if (!payload.board_id) {
      return new Response('Missing required field: board_id', { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 3.2: Call advance_topic_presenter RPC — all DB mutations are atomic inside the RPC.
    // Returns { out_user_id, out_topic, out_user_name, out_wrapped }.
    const { data, error } = await supabase.rpc('advance_topic_presenter', {
      p_board_id: payload.board_id,
    });

    if (error) {
      console.error('advance_topic_presenter RPC error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const rows = data as AdvanceRpcRow[];
    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ error: 'RPC returned no rows' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = rows[0];

    // 3.3: Return assignment result to caller
    return new Response(
      JSON.stringify({
        status: 'assigned',
        userId: result.out_user_id,
        topic: result.out_topic,
        wrapped: result.out_wrapped,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Unexpected error in assign-topic-presenter:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
});
