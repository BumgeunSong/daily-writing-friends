import { MAX_PROCESSED_FILE_SIZE } from '@/post/utils/ImageValidation';

const MAX_IMAGE_DIMENSION_FOR_UPLOAD = 1200;
const JPEG_QUALITY_FOR_UPLOAD = 0.85;
const PROFILE_PHOTO_SIZE = 96;

type ProcessingStage = 'resizing';
type ProcessingFailure = 'resize';

interface ProcessImageOptions {
    onStage?: (stage: ProcessingStage) => void;
    onError?: (failure: ProcessingFailure, error: unknown) => void;
}

interface ProcessedImage {
    file: File;
    rawSize: number;
    processedSize: number;
    didResize: boolean;
    resizeFailed: boolean;
}

const cropAndResizeImage = async (file: File, callback: (resizedFile: File) => void) => {
    try {
        const resizedFile = await resizeImage(file, PROFILE_PHOTO_SIZE);
        callback(resizedFile);
    } catch (error) {
        console.error('Error processing image:', error);
    }
};

/**
 * Process image for upload: resize to MAX_IMAGE_DIMENSION_FOR_UPLOAD.
 * HEIC/HEIF/GIF are rejected upstream by validateFileType, so this function
 * only handles JPEG/PNG/WebP inputs.
 */
const processImageForUpload = async (
    file: File,
    options: ProcessImageOptions = {},
): Promise<ProcessedImage> => {
    const rawSize = file.size;
    await yieldToBrowser();

    let processedFile = file;
    let didResize = false;
    let resizeFailed = false;

    options.onStage?.('resizing');
    try {
        const resizeResult = await resizeImageForUpload(processedFile);
        processedFile = resizeResult.file;
        didResize = resizeResult.didResize;
    } catch (error) {
        resizeFailed = true;
        options.onError?.('resize', error);
    }

    return {
        file: processedFile,
        rawSize,
        processedSize: processedFile.size,
        didResize,
        resizeFailed,
    };
};

interface ResizeResult {
    file: File;
    didResize: boolean;
}

/**
 * Decide whether an image must go through the canvas re-encode path.
 * Re-encoding is required when EITHER the pixel dimensions exceed the upload
 * cap OR the raw byte size already exceeds the post-processing limit — a
 * small-pixel-but-large-byte file (e.g., uncompressed PNG screenshot) would
 * otherwise sail past the resize step and fail validateProcessedFileSize.
 */
const needsReencoding = (
    fileSize: number,
    dimensions: ImageDimensions,
    maxDimension: number,
    maxBytes: number,
): boolean => {
    const exceedsDimensions =
        dimensions.width > maxDimension || dimensions.height > maxDimension;
    const exceedsByteSize = fileSize > maxBytes;
    return exceedsDimensions || exceedsByteSize;
};

const resizeImageForUpload = async (file: File): Promise<ResizeResult> => {
    const dimensions = await loadImageDimensions(file);

    if (
        !needsReencoding(file.size, dimensions, MAX_IMAGE_DIMENSION_FOR_UPLOAD, MAX_PROCESSED_FILE_SIZE)
    ) {
        return { file, didResize: false };
    }

    const canvas = await drawImageScaled(file, dimensions, MAX_IMAGE_DIMENSION_FOR_UPLOAD);
    const blob = await canvasToBlob(canvas, 'image/jpeg', JPEG_QUALITY_FOR_UPLOAD);
    const resizedFileName = file.name.replace(/\.[^.]+$/, '.jpg');
    return { file: blobToFile(blob, resizedFileName, 'image/jpeg'), didResize: true };
};

interface ImageDimensions {
    width: number;
    height: number;
}

const loadImageDimensions = async (file: File): Promise<ImageDimensions> => {
    if (typeof createImageBitmap === 'function') {
        const bitmap = await createImageBitmap(file);
        const dimensions = { width: bitmap.width, height: bitmap.height };
        bitmap.close?.();
        return dimensions;
    }
    const dataURL = await readFileAsDataURL(file);
    const img = await loadImage(dataURL);
    return { width: img.width, height: img.height };
};

const drawImageScaled = async (
    file: File,
    dimensions: ImageDimensions,
    maxSize: number,
): Promise<HTMLCanvasElement> => {
    const { width: scaledWidth, height: scaledHeight } = computeScaledDimensions(dimensions, maxSize);
    const canvas = document.createElement('canvas');
    canvas.width = scaledWidth;
    canvas.height = scaledHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    if (typeof createImageBitmap === 'function') {
        const bitmap = await createImageBitmap(file);
        ctx.drawImage(bitmap, 0, 0, scaledWidth, scaledHeight);
        bitmap.close?.();
        return canvas;
    }

    const dataURL = await readFileAsDataURL(file);
    const img = await loadImage(dataURL);
    ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
    return canvas;
};

const computeScaledDimensions = (
    dimensions: ImageDimensions,
    maxSize: number,
): ImageDimensions => {
    const { width, height } = dimensions;
    const isWiderThanTall = width > height;

    if (isWiderThanTall && width > maxSize) {
        return { width: maxSize, height: Math.round((height * maxSize) / width) };
    }
    if (!isWiderThanTall && height > maxSize) {
        return { width: Math.round((width * maxSize) / height), height: maxSize };
    }
    return dimensions;
};

const yieldToBrowser = (): Promise<void> => {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
};

const resizeImage = async (file: File, maxSize: number): Promise<File> => {
    const dataURL = await readFileAsDataURL(file);
    const img = await loadImage(dataURL);
    const canvas = drawImageCenterCropped(img, maxSize);
    const blob = await canvasToBlob(canvas, file.type);
    return blobToFile(blob, file.name, file.type);
};

const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
};

const drawImageCenterCropped = (img: HTMLImageElement, maxSize: number): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    const size = Math.min(img.width, img.height);
    const offsetX = (img.width - size) / 2;
    const offsetY = (img.height - size) / 2;

    canvas.width = maxSize;
    canvas.height = maxSize;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(img, offsetX, offsetY, size, size, 0, 0, maxSize, maxSize);

    return canvas;
};

const canvasToBlob = (
    canvas: HTMLCanvasElement,
    fileType: string,
    quality?: number,
): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Canvas to Blob conversion failed.'));
                }
            },
            fileType,
            quality,
        );
    });
};

const blobToFile = (blob: Blob, fileName: string, fileType: string): File => {
    return new File([blob], fileName, { type: fileType });
};

export { computeScaledDimensions, cropAndResizeImage, needsReencoding, processImageForUpload };
export type { ImageDimensions, ProcessedImage, ProcessImageOptions, ProcessingFailure, ProcessingStage };
