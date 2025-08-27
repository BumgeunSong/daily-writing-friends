import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import { NativeTextEditor } from '../NativeTextEditor';

// Mock Firebase storage
jest.mock('@/firebase', () => ({
  storage: {
    ref: jest.fn(),
  },
}));

describe('NativeTextEditor', () => {
  describe('when user types Korean text', () => {
    it('handles IME composition correctly', async () => {
      const mockOnSave = jest.fn();
      
      render(
        <NativeTextEditor 
          onSave={mockOnSave}
          placeholder="테스트용 에디터"
        />
      );

      const textarea = screen.getByPlaceholderText('테스트용 에디터');
      
      // Simulate Korean IME composition
      fireEvent.compositionStart(textarea);
      
      // During composition, intermediate characters should not trigger content updates
      fireEvent.change(textarea, { target: { value: 'ㅇ' } });
      fireEvent.change(textarea, { target: { value: '안' } });
      fireEvent.change(textarea, { target: { value: '안ㄴ' } });
      fireEvent.change(textarea, { target: { value: '안녀' } });
      fireEvent.change(textarea, { target: { value: '안녕' } });
      
      // Composition ends - final character should be applied
      fireEvent.compositionEnd(textarea);
      fireEvent.change(textarea, { target: { value: '안녕하세요!' } });

      // Verify Korean text is preserved correctly
      expect(textarea.value).toBe('안녕하세요!');
    });
  });

  describe('when user uses formatting shortcuts', () => {
    it('applies bold formatting with Ctrl+B', () => {
      const mockOnSave = jest.fn();
      
      render(<NativeTextEditor onSave={mockOnSave} />);
      
      const textarea = screen.getByRole('textbox');
      
      // Type some text and select it
      fireEvent.change(textarea, { target: { value: '굵게 만들기' } });
      textarea.setSelectionRange(0, 5); // Select "굵게 만들"
      
      // Press Ctrl+B
      fireEvent.keyDown(textarea, { key: 'b', ctrlKey: true });
      
      // Check that markdown bold syntax is applied
      expect(textarea.value).toBe('**굵게 만들**기');
    });
    
    it('applies italic formatting with Ctrl+I', () => {
      const mockOnSave = jest.fn();
      
      render(<NativeTextEditor onSave={mockOnSave} />);
      
      const textarea = screen.getByRole('textbox');
      
      // Type Korean text and select it
      fireEvent.change(textarea, { target: { value: '기울임체 텍스트' } });
      textarea.setSelectionRange(0, 4); // Select "기울임체"
      
      // Press Ctrl+I
      fireEvent.keyDown(textarea, { key: 'i', ctrlKey: true });
      
      // Check that markdown italic syntax is applied
      expect(textarea.value).toBe('*기울임체* 텍스트');
    });
  });

  describe('when user pastes an image', () => {
    it('prevents default paste and initiates upload', async () => {
      const mockOnSave = jest.fn();
      
      render(<NativeTextEditor onSave={mockOnSave} />);
      
      const textarea = screen.getByRole('textbox');
      
      // Create a mock clipboard event with image data
      const mockFile = new File(['fake image'], 'test.png', { type: 'image/png' });
      const mockClipboardData = {
        items: [{
          type: 'image/png',
          getAsFile: () => mockFile,
        }],
      };
      
      const pasteEvent = new Event('paste', { bubbles: true });
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: mockClipboardData,
      });
      
      // Mock the image upload process
      fireEvent(textarea, pasteEvent);
      
      // Should show upload placeholder
      await waitFor(() => {
        expect(textarea.value).toContain('![Uploading test.png...]');
      });
    });
  });

  describe('when using toolbar buttons', () => {
    it('applies formatting when toolbar buttons are clicked', () => {
      const mockOnSave = jest.fn();
      
      render(<NativeTextEditor onSave={mockOnSave} variant="inline" />);
      
      const textarea = screen.getByRole('textbox');
      
      // Type Korean text and select it  
      fireEvent.change(textarea, { target: { value: '제목입니다' } });
      textarea.setSelectionRange(0, 5); // Select all text
      
      // Click the Bold button in toolbar
      const boldButton = screen.getByLabelText('Bold');
      fireEvent.click(boldButton);
      
      // Check that bold formatting is applied
      expect(textarea.value).toBe('**제목입니다**');
    });
  });

  describe('accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<NativeTextEditor />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
      
      // Toolbar buttons should have proper aria-labels
      const boldButton = screen.getByLabelText('Bold');
      const italicButton = screen.getByLabelText('Italic');
      const linkButton = screen.getByLabelText('Insert Link');
      
      expect(boldButton).toBeInTheDocument();
      expect(italicButton).toBeInTheDocument();
      expect(linkButton).toBeInTheDocument();
    });
  });
});