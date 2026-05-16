import { describe, it, expect, vi } from 'vitest';

vi.mock('heic2any', () => ({
  default: vi.fn(),
}));

import heic2any from 'heic2any';
import { processImageForUpload } from '../ImageUtils';

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
  it('returns original file when HEIC conversion fails', async () => {
    const heicFile = createFile('photo.heic', 1024, 'image/heic');
    vi.mocked(heic2any).mockRejectedValueOnce(new Error('Conversion failed'));
    vi.stubGlobal('createImageBitmap', undefined);
    mockImageAndFileReader();

    const result = await processImageForUpload(heicFile);

    expect(result.file).toBe(heicFile);
    expect(result.file.name).toBe('photo.heic');
    expect(result.wasHeic).toBe(true);
    expect(result.rawSize).toBe(1024);
    expect(result.didResize).toBe(false);
  });

  it('converts HEIC file when conversion succeeds', async () => {
    const heicFile = createFile('photo.heic', 1024, 'image/heic');
    const convertedBlob = new Blob([new ArrayBuffer(512)], { type: 'image/jpeg' });
    vi.mocked(heic2any).mockResolvedValueOnce(convertedBlob);
    vi.stubGlobal('createImageBitmap', undefined);
    mockImageAndFileReader();

    const result = await processImageForUpload(heicFile);

    expect(result.file.name).toBe('photo.jpg');
    expect(result.file.type).toBe('image/jpeg');
    expect(result.wasHeic).toBe(true);
  });

  it('reports onStage callbacks for HEIC files', async () => {
    const heicFile = createFile('photo.heic', 1024, 'image/heic');
    const convertedBlob = new Blob([new ArrayBuffer(512)], { type: 'image/jpeg' });
    vi.mocked(heic2any).mockResolvedValueOnce(convertedBlob);
    vi.stubGlobal('createImageBitmap', undefined);
    mockImageAndFileReader();

    const stages: string[] = [];
    await processImageForUpload(heicFile, {
      onStage: (stage) => stages.push(stage),
    });

    expect(stages).toEqual(['converting', 'resizing']);
  });

  it('skips converting stage for non-HEIC files', async () => {
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
    expect(result.file).toBe(jpegFile);
  });
});
