import { describe, it, expect, vi } from 'vitest';
import { needsReencoding, processImageForUpload } from '../ImageUtils';

const FIVE_MB = 5 * 1024 * 1024;
const MAX_DIM = 1200;

vi.stubGlobal('requestAnimationFrame', (cb: () => void) => {
  cb();
  return 0;
});

function createFile(name: string, size: number, type: string): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

function mockImageAndFileReader(width = 100, height = 100) {
  const mockImage = {
    width,
    height,
    onload: null as (() => void) | null,
    onerror: null as (() => void) | null,
    set src(_: string) {
      setTimeout(() => this.onload?.(), 0);
    },
  };
  vi.spyOn(globalThis, 'Image').mockImplementation(
    () => mockImage as unknown as HTMLImageElement,
  );

  const mockReader = {
    result: 'data:image/jpeg;base64,test',
    onload: null as (() => void) | null,
    onerror: null as (() => void) | null,
    readAsDataURL() {
      setTimeout(() => this.onload?.(), 0);
    },
  };
  vi.spyOn(globalThis, 'FileReader').mockImplementation(
    () => mockReader as unknown as FileReader,
  );
}

describe('processImageForUpload', () => {
  it('emits only the resizing stage', async () => {
    const jpegFile = createFile('photo.jpg', 1024, 'image/jpeg');
    vi.stubGlobal('createImageBitmap', undefined);
    mockImageAndFileReader();

    const stages: string[] = [];
    await processImageForUpload(jpegFile, {
      onStage: (stage) => stages.push(stage),
    });

    expect(stages).toEqual(['resizing']);
  });

  it('returns didResize=false when image is within max dimension', async () => {
    const jpegFile = createFile('small.jpg', 1024, 'image/jpeg');
    vi.stubGlobal('createImageBitmap', undefined);
    mockImageAndFileReader(800, 600);

    const result = await processImageForUpload(jpegFile);

    expect(result.didResize).toBe(false);
    expect(result.resizeFailed).toBe(false);
    expect(result.file).toBe(jpegFile);
    expect(result.rawSize).toBe(1024);
  });

  it('reports onError with resize failure when canvas decoding throws', async () => {
    const jpegFile = createFile('photo.jpg', 1024, 'image/jpeg');
    const decodeError = new Error('decode failed');
    vi.stubGlobal('createImageBitmap', undefined);
    vi.spyOn(globalThis, 'FileReader').mockImplementation(
      () =>
        ({
          result: 'data:image/jpeg;base64,test',
          onload: null,
          onerror: null,
          readAsDataURL() {
            setTimeout(() => (this as unknown as FileReader).onerror?.(decodeError as unknown as ProgressEvent<FileReader>), 0);
          },
        }) as unknown as FileReader,
    );

    const onError = vi.fn();
    const result = await processImageForUpload(jpegFile, { onError });

    expect(result.resizeFailed).toBe(true);
    expect(onError).toHaveBeenCalledWith('resize', expect.anything());
  });
});

describe('needsReencoding', () => {
  it('returns false when dimensions and byte size are both within limits', () => {
    expect(needsReencoding(1024, { width: 800, height: 600 }, MAX_DIM, FIVE_MB)).toBe(false);
  });

  it('returns true when width exceeds the dimension cap', () => {
    expect(needsReencoding(1024, { width: MAX_DIM + 1, height: 600 }, MAX_DIM, FIVE_MB)).toBe(
      true,
    );
  });

  it('returns true when height exceeds the dimension cap', () => {
    expect(needsReencoding(1024, { width: 600, height: MAX_DIM + 1 }, MAX_DIM, FIVE_MB)).toBe(
      true,
    );
  });

  it('returns true when byte size exceeds the cap even if dimensions are small', () => {
    expect(needsReencoding(FIVE_MB + 1, { width: 800, height: 800 }, MAX_DIM, FIVE_MB)).toBe(
      true,
    );
  });

  it('returns false at the exact byte cap', () => {
    expect(needsReencoding(FIVE_MB, { width: 800, height: 800 }, MAX_DIM, FIVE_MB)).toBe(false);
  });

  it('returns false at the exact dimension cap', () => {
    expect(needsReencoding(1024, { width: MAX_DIM, height: MAX_DIM }, MAX_DIM, FIVE_MB)).toBe(
      false,
    );
  });
});
