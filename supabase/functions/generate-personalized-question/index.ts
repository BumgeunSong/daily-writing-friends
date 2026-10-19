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

function decodeBase64Url(segment: string): string {
  return atob(segment.replace(/-/g, '+').replace(/_/g, '/'));
}

function isServiceRole(req: Request): boolean {
  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
  try {
    const claims: unknown = JSON.parse(decodeBase64Url(token.split('.')[1]));
    return (
      typeof claims === 'object' &&
      claims !== null &&
      (claims as { role?: unknown }).role === 'service_role'
    );
  } catch {
    return false;
  }
}

/** 성공(200)이 아니라 처리를 건너뛴 경우. 운영에서 사유를 구분할 수 있도록 본문과 로그에 남긴다. */
function skipped(postId: unknown, reason: string): Response {
  console.log('skipped', { postId, reason });
  return new Response(`skipped: ${reason}`, { status: 200 });
}

/**
 * 오류 객체 전체에는 요청 본문(회원의 글)이 실릴 수 있어 메시지만 남긴다.
 * Supabase DB 오류는 Error 인스턴스가 아닌 일반 객체라 `message` 필드를 따로 꺼낸다.
 */
function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === 'string' ? message : String(error);
}

serve(async (req) => {
  let postId: unknown;
  try {
    // DB 트리거(pg_net)만 호출할 수 있다. 일반 사용자 JWT로 LLM 비용을 일으키지 못하게 한다.
    if (!isServiceRole(req)) {
      console.warn('forbidden: caller is not service_role');
      return new Response('Forbidden', { status: 403 });
    }

    const body = await req.json();
    postId = body.post_id;
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
    if (!post) return skipped(postId, 'post not found');
    // 트리거가 거르지만, 호출 시점과 실행 시점 사이에 비공개로 바뀔 수 있어 한 번 더 확인한다.
    if (post.visibility !== 'public') return skipped(postId, 'not public');

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
    if (question === null) return skipped(postId, 'no question');

    const { error: insertError } = await supabase.from('personalized_questions').insert({
      user_id: post.author_id,
      source_post_id: post.id,
      question,
    });
    // 트리거 재시도로 같은 글이 다시 오면 UNIQUE 위반이 나는데, 이미 있으니 성공으로 본다.
    if (insertError?.code === UNIQUE_VIOLATION) return skipped(postId, 'already exists');
    if (insertError) throw insertError;

    console.log('created', { postId, sourceType });
    return new Response('created', { status: 200 });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      console.error('anthropic rate limited', { postId, message: error.message });
    } else if (error instanceof Anthropic.APIConnectionError) {
      console.error('anthropic connection error', { postId, message: error.message });
    } else if (error instanceof Anthropic.APIError) {
      console.error('anthropic api error', { postId, status: error.status, message: error.message });
    } else {
      console.error('generate-personalized-question failed', { postId, message: describeError(error) });
    }
    return new Response('Internal Server Error', { status: 500 });
  }
});
