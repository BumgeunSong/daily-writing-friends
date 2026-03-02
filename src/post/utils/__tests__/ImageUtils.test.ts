import { describe, it, expect, vi } from 'vitest';

// Mock heic2any before importing the module
vi.mock('heic2any', () => ({
  default: vi.fn(),
}));

import heic2any from 'heic2any';
import { processImageForUpload } from '../ImageUtils';

// Mock requestAnimationFrame for yieldToBrowser
vi.stubGlobal('requestAnimationFrame', (cb: () => void) => {
  cb();
  return 0;
});

function createFile(name: string, size: number, type: string): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

describe('processImageForUpload', () => {
  it('returns original file when HEIC conversion fails', async () => {
    const heicFile = createFile('photo.heic', 1024, 'image/heic');

    vi.mocked(heic2any).mockRejectedValueOnce(new Error('Conversion failed'));

    // Mock Image and FileReader for the resize step that still runs after HEIC failure
    const mockImage = {
      width: 100,
      height: 100,
      onload: null as (() => void) | null,
      onerror: null as (() => void) | null,
      set src(_: string) {
        setTimeout(() => this.onload?.(), 0);
      },
    };
    vi.spyOn(globalThis, 'Image').mockImplementation(() => mockImage as unknown as HTMLImageElement);

    const mockReader = {
      result: 'data:image/heic;base64,test',
      onload: null as (() => void) | null,
      onerror: null as (() => void) | null,
      readAsDataURL() {
        setTimeout(() => this.onload?.(), 0);
      },
    };
    vi.spyOn(globalThis, 'FileReader').mockImplementation(() => mockReader as unknown as FileReader);

    const result = await processImageForUpload(heicFile);

    // Should return the original file (not throw)
    expect(result).toBe(heicFile);
    expect(result.name).toBe('photo.heic');
  });

  it('converts HEIC file when conversion succeeds', async () => {
    const heicFile = createFile('photo.heic', 1024, 'image/heic');
    const convertedBlob = new Blob([new ArrayBuffer(512)], { type: 'image/jpeg' });

    vi.mocked(heic2any).mockResolvedValueOnce(convertedBlob);

    // Mock image loading and canvas for the resize step
    const mockImage = {
      width: 100,
      height: 100,
      onload: null as (() => void) | null,
      onerror: null as (() => void) | null,
      set src(_: string) {
        setTimeout(() => this.onload?.(), 0);
      },
    };
    vi.spyOn(globalThis, 'Image').mockImplementation(() => mockImage as unknown as HTMLImageElement);

    // FileReader mock
    const mockReader = {
      result: 'data:image/jpeg;base64,test',
      onload: null as (() => void) | null,
      onerror: null as (() => void) | null,
      readAsDataURL() {
        setTimeout(() => this.onload?.(), 0);
      },
    };
    vi.spyOn(globalThis, 'FileReader').mockImplementation(() => mockReader as unknown as FileReader);

    const result = await processImageForUpload(heicFile);

    // Converted file should have .jpg extension
    expect(result.name).toBe('photo.jpg');
    expect(result.type).toBe('image/jpeg');
  });
});
