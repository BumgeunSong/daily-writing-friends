import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk';
import {
  buildSystemPrompt,
  buildUserMessage,
  detectSourceType,
  parseQuestion,
  QUESTION_JSON_FORMAT,
  QUESTION_MODEL,
} from '../_shared/personalizedQuestion.ts';

const UNIQUE_VIOLATION = '23505';

function isServiceRole(req: Request): boolean {
  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
  try {
    const claims: unknown = JSON.parse(atob(token.split('.')[1]));
    return (
      typeof claims === 'object' &&
      claims !== null &&
      (claims as { role?: unknown }).role === 'service_role'
    );
  } catch {
    return false;
  }
}

serve(async (req) => {
  try {
    // DB 트리거(pg_net)만 호출할 수 있다. 일반 사용자 JWT로 LLM 비용을 일으키지 못하게 한다.
    if (!isServiceRole(req)) {
      return new Response('Forbidden', { status: 403 });
    }

    const { post_id: postId } = await req.json();
    if (typeof postId !== 'string' || postId === '') {
      return new Response('Missing post_id', { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, author_id, title, content, visibility')
      .eq('id', postId)
      .maybeSingle();
    if (postError) throw postError;
    if (!post) return new Response('post not found', { status: 200 });
    // 트리거가 거르지만, 호출 시점과 실행 시점 사이에 비공개로 바뀔 수 있어 한 번 더 확인한다.
    if (post.visibility !== 'public') return new Response('not public', { status: 200 });

    const sourceType = detectSourceType(post.content ?? '');
    const client = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
      timeout: 20_000,
    });

    const response = await client.messages.create({
      model: QUESTION_MODEL,
      max_tokens: 1500,
      system: buildSystemPrompt(sourceType),
      messages: [
        {
          role: 'user',
          content: buildUserMessage({ title: post.title ?? '', content: post.content ?? '' }, sourceType),
        },
      ],
      output_config: { effort: 'medium', format: QUESTION_JSON_FORMAT },
    } as Anthropic.MessageCreateParamsNonStreaming);

    console.log('usage', { postId, sourceType, usage: response.usage, stop_reason: response.stop_reason });

    const question = parseQuestion(response);
    if (question === null) return new Response('no question', { status: 200 });

    const { error: insertError } = await supabase.from('personalized_questions').insert({
      user_id: post.author_id,
      source_post_id: post.id,
      question,
    });
    // 트리거 재시도로 같은 글이 다시 오면 UNIQUE 위반이 나는데, 이미 있으니 성공으로 본다.
    if (insertError && insertError.code !== UNIQUE_VIOLATION) throw insertError;

    return new Response('ok', { status: 200 });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      console.error('anthropic rate limited', error.message);
    } else if (error instanceof Anthropic.APIConnectionError) {
      console.error('anthropic connection error', error.message);
    } else if (error instanceof Anthropic.APIError) {
      console.error('anthropic api error', error.status, error.message);
    } else {
      console.error('generate-personalized-question failed', error);
    }
    return new Response('Internal Server Error', { status: 500 });
  }
});
