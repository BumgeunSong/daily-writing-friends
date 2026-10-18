import { withAdmin, AdminApiError } from '@/lib/server/with-admin';
import { getServerSupabase } from '@/lib/server/supabase';
import {
  CreateJustThreeQuestionRequestSchema,
  CreateJustThreeQuestionResponseSchema,
  GetJustThreeQuestionsResponseSchema,
  type SupabaseJustThreeQuestion,
} from '@/types/admin-api-contracts';

export const GET = withAdmin({
  kind: 'read',
  schema: GetJustThreeQuestionsResponseSchema,
  handler: async () => {
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from('just_three_questions')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw AdminApiError.serverError(error.message);
    return { questions: (data ?? []) as SupabaseJustThreeQuestion[] };
  },
});

export const POST = withAdmin({
  kind: 'mutation',
  action: 'just-three-questions.create',
  schema: CreateJustThreeQuestionResponseSchema,
  handler: async ({ req }) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw AdminApiError.badRequest('Body must be JSON.');
    }
    const parsed = CreateJustThreeQuestionRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw AdminApiError.badRequest(`Invalid body: ${JSON.stringify(parsed.error.flatten())}`);
    }
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from('just_three_questions')
      .insert({ question: parsed.data.question })
      .select('*')
      .single();
    if (error) throw AdminApiError.serverError(error.message);
    const question = data as SupabaseJustThreeQuestion;
    return {
      data: { question },
      auditTarget: { questionId: question.id },
    };
  },
});
