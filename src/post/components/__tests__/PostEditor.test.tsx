import { render, screen } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { PostEditor } from '../PostEditor';

// Mock the RemoteConfigContext
const mockUseRemoteConfig = jest.fn();
jest.mock('@/shared/contexts/RemoteConfigContext', () => ({
  useRemoteConfig: mockUseRemoteConfig,
}));

// Mock Firebase
jest.mock('@/firebase', () => ({
  storage: { ref: jest.fn() },
}));

// Mock the different editor components
jest.mock('../PostTextEditor', () => ({
  PostTextEditor: ({ placeholder }: { placeholder?: string }) => (
    <div data-testid="quill-editor">Quill Editor: {placeholder}</div>
  ),
}));

jest.mock('../EditorTiptap', () => ({
  EditorTiptap: ({ placeholder }: { placeholder?: string }) => (
    <div data-testid="tiptap-editor">TipTap Editor: {placeholder}</div>
  ),
}));

jest.mock('../NativeTextEditor', () => ({
  NativeTextEditor: ({ placeholder }: { placeholder?: string }) => (
    <div data-testid="native-editor">Native Editor: {placeholder}</div>
  ),
}));

describe('PostEditor', () => {
  const mockOnChange = jest.fn();
  const defaultProps = {
    value: 'test content',
    onChange: mockOnChange,
    placeholder: '테스트 플레이스홀더',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when native_editor_enabled is true', () => {
    it('renders the Native editor', () => {
      mockUseRemoteConfig.mockImplementation((key: string) => {
        if (key === 'native_editor_enabled') {
          return { value: true, isLoading: false, error: null };
        }
        if (key === 'tiptap_editor_enabled') {
          return { value: false, isLoading: false, error: null };
        }
        return { value: false, isLoading: false, error: null };
      });

      render(<PostEditor {...defaultProps} />);

      expect(screen.getByTestId('native-editor')).toBeInTheDocument();
      expect(screen.getByText('Native Editor: 테스트 플레이스홀더')).toBeInTheDocument();
      expect(screen.queryByTestId('tiptap-editor')).not.toBeInTheDocument();
      expect(screen.queryByTestId('quill-editor')).not.toBeInTheDocument();
    });
  });

  describe('when native_editor_enabled is false and tiptap_editor_enabled is true', () => {
    it('renders the TipTap editor', () => {
      mockUseRemoteConfig.mockImplementation((key: string) => {
        if (key === 'native_editor_enabled') {
          return { value: false, isLoading: false, error: null };
        }
        if (key === 'tiptap_editor_enabled') {
          return { value: true, isLoading: false, error: null };
        }
        return { value: false, isLoading: false, error: null };
      });

      render(<PostEditor {...defaultProps} />);

      expect(screen.getByTestId('tiptap-editor')).toBeInTheDocument();
      expect(screen.getByText('TipTap Editor: 테스트 플레이스홀더')).toBeInTheDocument();
      expect(screen.queryByTestId('native-editor')).not.toBeInTheDocument();
      expect(screen.queryByTestId('quill-editor')).not.toBeInTheDocument();
    });
  });

  describe('when both flags are false', () => {
    it('renders the default Quill editor', () => {
      mockUseRemoteConfig.mockImplementation((key: string) => {
        return { value: false, isLoading: false, error: null };
      });

      render(<PostEditor {...defaultProps} />);

      expect(screen.getByTestId('quill-editor')).toBeInTheDocument();
      expect(screen.getByText('Quill Editor: 테스트 플레이스홀더')).toBeInTheDocument();
      expect(screen.queryByTestId('native-editor')).not.toBeInTheDocument();
      expect(screen.queryByTestId('tiptap-editor')).not.toBeInTheDocument();
    });
  });

  describe('when native_editor_enabled is true and tiptap_editor_enabled is also true', () => {
    it('prioritizes Native editor over TipTap', () => {
      mockUseRemoteConfig.mockImplementation((key: string) => {
        return { value: true, isLoading: false, error: null };
      });

      render(<PostEditor {...defaultProps} />);

      // Native editor should be shown (higher priority)
      expect(screen.getByTestId('native-editor')).toBeInTheDocument();
      expect(screen.queryByTestId('tiptap-editor')).not.toBeInTheDocument();
      expect(screen.queryByTestId('quill-editor')).not.toBeInTheDocument();
    });
  });
});