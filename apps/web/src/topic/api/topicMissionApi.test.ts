import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAssignedPresenter, registerTopic } from './topicMissionApi';

// Fluent Supabase builder mock
const mockMaybeSingle = vi.fn();
const mockInsert = vi.fn();

const makeEqChain = (): { eq: ReturnType<typeof vi.fn>; maybeSingle: ReturnType<typeof vi.fn> } => {
  const chain: { eq: ReturnType<typeof vi.fn>; maybeSingle: ReturnType<typeof vi.fn> } = {
    maybeSingle: mockMaybeSingle,
    eq: vi.fn(() => chain),
  };
  return chain;
};

const mockFrom = vi.fn();

vi.mock('@/shared/api/supabaseClient', () => ({
  getSupabaseClient: () => ({ from: mockFrom }),
  throwOnError: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// T.8: fetchAssignedPresenter queries status = 'assigned' filter for given boardId
describe('fetchAssignedPresenter', () => {
  it('queries topic_missions with board_id and status = assigned filter', async () => {
    const eqChain = makeEqChain();
    const mockSelect = vi.fn(() => eqChain);
    mockFrom.mockReturnValue({ select: mockSelect });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    await fetchAssignedPresenter('board-abc');

    expect(mockFrom).toHaveBeenCalledWith('topic_missions');
    expect(mockSelect).toHaveBeenCalledWith('user_id, topic, users(nickname)');
    // Verify the eq chain was called with board_id and status filters
    expect(eqChain.eq).toHaveBeenCalledWith('board_id', 'board-abc');
    expect(eqChain.eq).toHaveBeenCalledWith('status', 'assigned');
    expect(mockMaybeSingle).toHaveBeenCalled();
  });

  it('returns null when no assigned presenter exists', async () => {
    const eqChain = makeEqChain();
    mockFrom.mockReturnValue({ select: vi.fn(() => eqChain) });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await fetchAssignedPresenter('board-abc');

    expect(result).toBeNull();
  });

  it('maps row to AssignedPresenter with userName from nested users join', async () => {
    const eqChain = makeEqChain();
    mockFrom.mockReturnValue({ select: vi.fn(() => eqChain) });
    mockMaybeSingle.mockResolvedValue({
      data: { user_id: 'u1', topic: '리액트 훅', users: { nickname: '홍길동' } },
      error: null,
    });

    const result = await fetchAssignedPresenter('board-abc');

    expect(result).toEqual({ userId: 'u1', topic: '리액트 훅', userName: '홍길동' });
  });
});

// T.7: registerTopic calls correct table and columns; omits order_index from payload
describe('registerTopic', () => {
  it('inserts into topic_missions with board_id, user_id, and topic — no order_index', async () => {
    const mockInsertChain = { error: null };
    mockInsert.mockResolvedValue(mockInsertChain);
    mockFrom.mockReturnValue({ insert: mockInsert });

    await registerTopic('board-xyz', 'GraphQL 심화', 'user-42');

    expect(mockFrom).toHaveBeenCalledWith('topic_missions');
    const payload = mockInsert.mock.calls[0][0];
    expect(payload).toEqual({ board_id: 'board-xyz', user_id: 'user-42', topic: 'GraphQL 심화' });
    expect(payload).not.toHaveProperty('order_index');
  });

  it('throws user-friendly error on unique constraint violation (23505)', async () => {
    mockInsert.mockResolvedValue({ error: { code: '23505', message: 'unique violation' } });
    mockFrom.mockReturnValue({ insert: mockInsert });

    await expect(registerTopic('board-xyz', '중복 주제', 'user-42')).rejects.toThrow(
      '이미 이 게시판에 발표 주제를 등록하셨습니다.',
    );
  });
});
