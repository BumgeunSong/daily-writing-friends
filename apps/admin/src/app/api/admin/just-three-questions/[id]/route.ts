import { NextRequest } from 'next/server';
import { withAdmin, AdminApiError } from '@/lib/server/with-admin';
import { getServerSupabase } from '@/lib/server/supabase';
import {
  UpdateJustThreeQuestionRequestSchema,
  UpdateJustThreeQuestionResponseSchema,
  type SupabaseJustThreeQuestion,
} from '@/types/admin-api-contracts';

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: RouteParams) {
  const { id } = await ctx.params;
  const handler = withAdmin({
    kind: 'mutation',
    action: 'just-three-questions.update',
    schema: UpdateJustThreeQuestionResponseSchema,
    handler: async ({ req }) => {
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        throw AdminApiError.badRequest('Body must be JSON.');
      }
      const parsed = UpdateJustThreeQuestionRequestSchema.safeParse(body);
      if (!parsed.success) {
        throw AdminApiError.badRequest(`Invalid body: ${JSON.stringify(parsed.error.flatten())}`);
      }
      const supabase = getServerSupabase();
      const { data, error } = await supabase
        .from('just_three_questions')
        .update({ is_active: parsed.data.isActive, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();
      if (error) {
        if (error.code === 'PGRST116') {
          throw AdminApiError.notFound(`Question ${id} not found.`);
        }
        throw AdminApiError.serverError(error.message);
      }
      const question = data as SupabaseJustThreeQuestion;
      return {
        data: { question },
        auditTarget: { questionId: question.id, isActive: question.is_active },
      };
    },
  });
  return handler(req);
}
