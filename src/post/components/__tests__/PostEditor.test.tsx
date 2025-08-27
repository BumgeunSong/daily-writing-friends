import { render, screen } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import { PostEditor } from '../PostEditor';

// Mock Firebase
jest.mock('@/firebase', () => ({
  storage: { ref: jest.fn() },
}));

// Mock the enhanced Quill editor component
jest.mock('../EnhancedPostTextEditor', () => ({
  EnhancedPostTextEditor: ({ 
    placeholder, 
    stickyToolbar 
  }: { 
    placeholder?: string; 
    stickyToolbar?: boolean; 
  }) => (
    <div data-testid="enhanced-quill-editor">
      Enhanced Quill Editor: {placeholder}
      {stickyToolbar && <div data-testid="sticky-toolbar">Sticky Toolbar</div>}
    </div>
  ),
}));

describe('PostEditor', () => {
  const mockOnChange = jest.fn();
  const defaultProps = {
    value: 'test content',
    onChange: mockOnChange,
    placeholder: '테스트 플레이스홀더',
  };

  it('renders the Enhanced Quill editor with sticky toolbar', () => {
    render(<PostEditor {...defaultProps} />);

    expect(screen.getByTestId('enhanced-quill-editor')).toBeInTheDocument();
    expect(screen.getByText('Enhanced Quill Editor: 테스트 플레이스홀더')).toBeInTheDocument();
    expect(screen.getByTestId('sticky-toolbar')).toBeInTheDocument();
  });

  it('passes all props correctly to EnhancedPostTextEditor', () => {
    const customPlaceholder = 'Custom placeholder';
    render(<PostEditor {...defaultProps} placeholder={customPlaceholder} />);

    expect(screen.getByText(`Enhanced Quill Editor: ${customPlaceholder}`)).toBeInTheDocument();
  });

  it('exposes focus method through ref', () => {
    const ref = { current: null };
    const mockFocus = jest.fn();

    // Mock the enhanced editor's focus method
    jest.doMock('../EnhancedPostTextEditor', () => ({
      EnhancedPostTextEditor: jest.fn().mockImplementation(() => {
        return <div data-testid="enhanced-quill-editor">Mock Editor</div>;
      }),
    }));

    render(<PostEditor {...defaultProps} ref={ref} />);

    // Verify that the ref has the focus method
    expect(typeof ref.current?.focus).toBe('function');
  });
});