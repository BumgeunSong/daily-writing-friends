import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReactWithEmoji from './ReactWithEmoji';
import '@testing-library/jest-dom';

// emoji-mart 모킹
vi.mock('@emoji-mart/react', () => ({
  __esModule: true,
  default: ({ onEmojiSelect }: { onEmojiSelect: (emoji: any) => void }) => {
    return (
      <div data-testid="emoji-picker">
        <button 
          data-testid="emoji-thumbs-up" 
          onClick={() => onEmojiSelect({ native: '👍' })}
        >
          👍
        </button>
        <button 
          data-testid="emoji-heart" 
          onClick={() => onEmojiSelect({ native: '❤️' })}
        >
          ❤️
        </button>
      </div>
    );
  }
}));

vi.mock('@emoji-mart/data', () => ({
  __esModule: true,
  default: {}
}));

describe('ReactWithEmoji', () => {
  it('반응 버튼을 렌더링합니다', () => {
    const mockOnCreate = vi.fn();
    render(<ReactWithEmoji onCreate={mockOnCreate} />);
    
    expect(screen.getByText('반응')).toBeInTheDocument();
  });
  
  it('버튼 클릭 시 이모지 피커를 표시합니다', async () => {
    const user = userEvent.setup();
    const mockOnCreate = vi.fn();
    render(<ReactWithEmoji onCreate={mockOnCreate} />);
    
    // 반응 버튼 클릭
    await user.click(screen.getByTestId('reaction-button'));
    
    // 이모지 피커가 표시되는지 확인
    expect(screen.getByTestId('emoji-picker')).toBeInTheDocument();
  });
  
  it('이모지 선택 시 onCreate 콜백을 호출합니다', async () => {
    const user = userEvent.setup();
    const mockOnCreate = vi.fn().mockResolvedValue(undefined);
    render(<ReactWithEmoji onCreate={mockOnCreate} />);
    
    // 반응 버튼 클릭
    await user.click(screen.getByTestId('reaction-button'));
    
    // 이모지 선택
    await user.click(screen.getByTestId('emoji-thumbs-up'));
    
    // onCreate가 호출되었는지 확인
    expect(mockOnCreate).toHaveBeenCalledWith('👍');
  });
  
  it('disabled 상태일 때 버튼이 비활성화됩니다', () => {
    const mockOnCreate = vi.fn();
    render(<ReactWithEmoji onCreate={mockOnCreate} disabled />);
    
    expect(screen.getByTestId('reaction-button')).toBeDisabled();
  });
  
  it('이모지 선택 중 로딩 상태를 표시합니다', async () => {
    const user = userEvent.setup();
    // 의도적으로 지연시키는 mock 함수
    const mockOnCreate = vi.fn().mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(() => resolve(undefined), 100);
      });
    });
    
    render(<ReactWithEmoji onCreate={mockOnCreate} />);
    
    // 반응 버튼 클릭
    await user.click(screen.getByTestId('reaction-button'));
    
    // 이모지 선택
    await user.click(screen.getByTestId('emoji-thumbs-up'));
    
    // 로딩 상태 확인
    expect(screen.getByText('처리 중...')).toBeInTheDocument();
    
    // 로딩이 완료될 때까지 기다림
    await waitFor(() => {
      expect(screen.queryByText('처리 중...')).not.toBeInTheDocument();
    });
  });
}); 