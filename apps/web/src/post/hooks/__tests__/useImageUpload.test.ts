import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useImageUpload } from '../useImageUpload';

// Mock all external dependencies
vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
}));

vi.mock('@/firebase', () => ({
  storage: {},
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(() => 'toast-id'),
  },
}));

vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

vi.mock('@/post/utils/ImageUtils', () => ({
  processImageForUpload: vi.fn((file: File) =>
    Promise.resolve({
      file,
      rawSize: file.size,
      processedSize: file.size,
      wasHeic: false,
      didResize: false,
    }),
  ),
}));

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'sonner';
import { processImageForUpload } from '@/post/utils/ImageUtils';

function createImageFile(name: string, size: number, type = 'image/jpeg'): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

/** Helper: mock document.createElement('input') so click() triggers onchange with given files */
function mockFileInput(files: File[]) {
  const origCreate = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'input') {
      const el = origCreate('input');
      el.click = () => {
        Object.defineProperty(el, 'files', { value: files, writable: false });
        setTimeout(() => el.onchange?.(new Event('change') as unknown as Event), 0);
      };
      return el;
    }
    return origCreate(tag);
  });
}

describe('useImageUpload', () => {
  const insertImage = vi.fn();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ref).mockReturnValue({} as ReturnType<typeof ref>);
    vi.mocked(uploadBytes).mockResolvedValue({ ref: {} } as Awaited<ReturnType<typeof uploadBytes>>);
    vi.mocked(getDownloadURL).mockResolvedValue('https://storage.example.com/image.jpg');
    vi.mocked(processImageForUpload).mockImplementation((file) =>
      Promise.resolve({
        file,
        rawSize: file.size,
        processedSize: file.size,
        wasHeic: false,
        didResize: false,
      }),
    );
  });

  describe('single file upload flow', () => {
    it('uploads file and calls insertImage with download URL', async () => {
      const { result } = renderHook(() =>
        useImageUpload({ insertImage, editorRoot: null }),
      );

      const file = createImageFile('photo.jpg', 1024);
      mockFileInput([file]);

      await act(async () => {
        await result.current.imageHandler(5);
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(processImageForUpload).toHaveBeenCalledWith(file);
      expect(uploadBytes).toHaveBeenCalled();
      expect(getDownloadURL).toHaveBeenCalled();
      expect(insertImage).toHaveBeenCalledWith('https://storage.example.com/image.jpg', 5);
      expect(toast.success).toHaveBeenCalled();
    });

    it('rejects non-image files with error toast', async () => {
      const { result } = renderHook(() =>
        useImageUpload({ insertImage, editorRoot: null }),
      );

      const file = createImageFile('doc.pdf', 1024, 'application/pdf');
      mockFileInput([file]);

      await act(async () => {
        await result.current.imageHandler();
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(uploadBytes).not.toHaveBeenCalled();
      expect(insertImage).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalled();
    });

    it('rejects files exceeding 20MB raw size limit', async () => {
      const { result } = renderHook(() =>
        useImageUpload({ insertImage, editorRoot: null }),
      );

      const bigFile = createImageFile('huge.jpg', 25 * 1024 * 1024);
      mockFileInput([bigFile]);

      await act(async () => {
        await result.current.imageHandler();
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(uploadBytes).not.toHaveBeenCalled();
      expect(insertImage).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe('multi-file upload flow', () => {
    it('uploads multiple files sequentially with cursor offset', async () => {
      const urls = [
        'https://storage.example.com/img1.jpg',
        'https://storage.example.com/img2.jpg',
      ];
      vi.mocked(getDownloadURL)
        .mockResolvedValueOnce(urls[0])
        .mockResolvedValueOnce(urls[1]);

      const { result } = renderHook(() =>
        useImageUpload({ insertImage, editorRoot: null }),
      );

      const files = [
        createImageFile('a.jpg', 1024),
        createImageFile('b.jpg', 2048),
      ];
      mockFileInput(files);

      await act(async () => {
        await result.current.imageHandler(10);
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(uploadBytes).toHaveBeenCalledTimes(2);
      expect(insertImage).toHaveBeenCalledTimes(2);
      expect(insertImage).toHaveBeenNthCalledWith(1, urls[0], 10);
      expect(insertImage).toHaveBeenNthCalledWith(2, urls[1], 11);
      expect(toast.success).toHaveBeenCalled();
    });

    it('shows warning toast when some files fail', async () => {
      vi.mocked(getDownloadURL)
        .mockResolvedValueOnce('https://storage.example.com/ok.jpg')
        .mockRejectedValueOnce(new Error('Upload failed'));

      const { result } = renderHook(() =>
        useImageUpload({ insertImage, editorRoot: null }),
      );

      const files = [
        createImageFile('ok.jpg', 1024),
        createImageFile('fail.jpg', 2048),
      ];
      mockFileInput(files);

      await act(async () => {
        await result.current.imageHandler();
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(insertImage).toHaveBeenCalledTimes(1);
      expect(toast.warning).toHaveBeenCalled();
    });
  });

  describe('callback stability', () => {
    it('imageHandler is stable when insertImage callback is stable', () => {
      const stableInsertImage = vi.fn();

      const { result, rerender } = renderHook(() =>
        useImageUpload({ insertImage: stableInsertImage, editorRoot: null }),
      );

      const firstHandler = result.current.imageHandler;
      rerender();
      const secondHandler = result.current.imageHandler;

      expect(firstHandler).toBe(secondHandler);
    });

    it('imageHandler stays stable after upload completes (isUploading toggle)', async () => {
      const stableInsertImage = vi.fn();

      const { result } = renderHook(() =>
        useImageUpload({ insertImage: stableInsertImage, editorRoot: null }),
      );

      const handlerBefore = result.current.imageHandler;

      const file = createImageFile('photo.jpg', 1024);
      mockFileInput([file]);

      await act(async () => {
        await result.current.imageHandler(0);
        await new Promise((r) => setTimeout(r, 10));
      });

      // After upload completes, isUploading goes true→false.
      // imageHandler must remain the same reference to avoid Quill reinit.
      expect(result.current.imageHandler).toBe(handlerBefore);
    });
  });

  describe('paste handler', () => {
    it('calls preventDefault and stopPropagation to block Quill default paste', async () => {
      const editorRoot = document.createElement('div');

      const { unmount } = renderHook(() =>
        useImageUpload({ insertImage, editorRoot }),
      );

      const file = new File([new ArrayBuffer(1024)], 'paste.jpg', { type: 'image/jpeg' });

      // jsdom lacks DataTransfer, so build a minimal clipboardData mock
      const clipboardData = {
        items: [{ type: 'image/jpeg', getAsFile: () => file }],
      } as unknown as DataTransfer;

      const pasteEvent = new Event('paste', { bubbles: true, cancelable: true }) as unknown as ClipboardEvent;
      Object.defineProperty(pasteEvent, 'clipboardData', { value: clipboardData });

      const preventDefaultSpy = vi.spyOn(pasteEvent, 'preventDefault');
      const stopPropagationSpy = vi.spyOn(pasteEvent, 'stopPropagation');

      await act(async () => {
        editorRoot.dispatchEvent(pasteEvent);
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();
      expect(uploadBytes).toHaveBeenCalled();

      unmount();
    });
  });
});
