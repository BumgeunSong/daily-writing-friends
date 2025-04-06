import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ReactionList from '@/components/pages/reaction/ReactionList';
import { useAuth } from '@/contexts/AuthContext';
import { useReactions } from '@/hooks/useReactions';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// AuthContext 모킹
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

// useReactions 훅 모킹
vi.mock('@/hooks/useReactions', () => ({
  useReactions: vi.fn()
}));

// EmojiPicker 모킹 (외부 라이브러리)
vi.mock('emoji-picker-react', () => ({
  default: ({ onEmojiClick }: { onEmojiClick: (emoji: any) => void }) => (
    <div data-testid="emoji-picker">
      <button 
        data-testid="emoji-thumbs-up" 
        onClick={() => onEmojiClick({ emoji: '👍' })}
      >
        👍
      </button>
      <button 
        data-testid="emoji-heart" 
        onClick={() => onEmojiClick({ emoji: '❤️' })}
      >
        ❤️
      </button>
    </div>
  )
}));

describe('ReactionList', () => {
  // 테스트에 사용할 목업 데이터
  const mockCurrentUser = { uid: 'user1', displayName: '김철수' };
  const mockReactions = [
    {
      content: '👍',
      by: [
        { userId: 'user1', userName: '김철수', userProfileImage: 'image1.jpg' },
        { userId: 'user2', userName: '이영희', userProfileImage: 'image2.jpg' }
      ]
    },
    {
      content: '❤️',
      by: [
        { userId: 'user3', userName: '박지민', userProfileImage: 'image3.jpg' }
      ]
    }
  ];
  
  const mockCreateReaction = vi.fn();
  const mockDeleteReaction = vi.fn();
  
  beforeEach(() => {
    // 각 테스트 전에 모킹 초기화
    vi.clearAllMocks();
    
    // useAuth 모킹 설정
    (useAuth as any).mockReturnValue({
      currentUser: mockCurrentUser
    });
    
    // useReactions 모킹 설정
    (useReactions as any).mockReturnValue({
      reactions: mockReactions,
      createReaction: mockCreateReaction,
      deleteReaction: mockDeleteReaction
    });
  });
  
  it('로그인한 사용자에게 반응 목록과 반응 버튼을 표시합니다', async () => {
    render(<ReactionList entityType="comment" entityId="comment1" />);
    
    // ReactWithEmoji 버튼이 표시되는지 확인
    expect(screen.getByText('반응')).toBeInTheDocument();
    
    // 반응 이모지가 표시되는지 확인
    expect(screen.getByText('👍')).toBeInTheDocument();
    expect(screen.getByText('❤️')).toBeInTheDocument();
    
    // 반응 카운트가 표시되는지 확인
    expect(screen.getByText('2')).toBeInTheDocument(); // 👍 반응 2개
    expect(screen.getByText('1')).toBeInTheDocument(); // ❤️ 반응 1개
  });
  
  
  it('반응 버튼을 클릭하면 이모지 피커가 표시됩니다', async () => {
    const user = userEvent.setup();
    render(<ReactionList entityType="comment" entityId="comment1" />);
    
    // 반응 버튼 클릭
    await user.click(screen.getByText('반응'));
    
    // 이모지 피커가 표시되는지 확인
    await waitFor(() => {
      expect(screen.getByTestId('emoji-picker')).toBeInTheDocument();
    });
  });
  
  it('이모지를 선택하면 createReaction이 호출됩니다', async () => {
    const user = userEvent.setup();
    render(<ReactionList entityType="comment" entityId="comment1" />);
    
    // 반응 버튼 클릭
    await user.click(screen.getByText('반응'));
    
    // 이모지 피커가 렌더링될 때까지 기다림
    await waitFor(() => {
      expect(screen.getByTestId('emoji-picker')).toBeInTheDocument();
    });
    
    // 이모지 선택
    await user.click(screen.getByTestId('emoji-thumbs-up'));
    
    // createReaction이 호출되었는지 확인
    expect(mockCreateReaction).toHaveBeenCalledWith('👍');
  });
  
  it('현재 사용자가 반응한 이모지를 클릭하면 deleteReaction이 호출됩니다', async () => {
    const user = userEvent.setup();
    render(<ReactionList entityType="comment" entityId="comment1" />);
    
    // 현재 사용자가 반응한 이모지(👍) 클릭
    await user.click(screen.getByText('👍'));
    
    // deleteReaction이 호출되었는지 확인
    expect(mockDeleteReaction).toHaveBeenCalledWith('👍', 'user1');
  });
  
  it('Suspense가 로딩 상태를 표시합니다', () => {
    // useReactions가 아직 로드되지 않은 상태로 설정
    (useReactions as any).mockImplementation(() => {
      throw new Promise(() => {}); // 영원히 해결되지 않는 프로미스로 로딩 상태 유지
    });
    
    render(<ReactionList entityType="comment" entityId="comment1" />);
    
    expect(screen.getByText('반응')).toBeInTheDocument();
  });
  
  it('올바른 props로 useReactions를 호출합니다', () => {
    render(<ReactionList entityType="reply" entityId="reply123" />);
    
    // useReactions가 올바른 props로 호출되었는지 확인
    expect(useReactions).toHaveBeenCalledWith({
      entityType: 'reply',
      entityId: 'reply123'
    });
  });
}); 