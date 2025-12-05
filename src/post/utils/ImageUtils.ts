import heic2any from 'heic2any';

const MAX_IMAGE_DIMENSION_FOR_UPLOAD = 1920;
const JPEG_QUALITY_FOR_UPLOAD = 0.85;

const cropAndResizeImage = async (file: File, callback: (resizedFile: File) => void) => {
    try {
        const resizedFile = await resizeImage(file, 96);
        callback(resizedFile);
    } catch (error) {
        console.error('Error processing image:', error);
    }
};

/**
 * Process image for upload: handles HEIC conversion and resizing.
 * Yields to browser before heavy operations to keep UI responsive.
 */
const processImageForUpload = async (file: File): Promise<File> => {
    // Yield to browser to allow loading UI to render
    await yieldToBrowser();

    let processedFile = file;

    // Convert HEIC/HEIF to JPEG
    if (isHeicFile(file)) {
        processedFile = await convertHeicToJpeg(file);
        await yieldToBrowser();
    }

    // Resize if image is too large
    processedFile = await resizeImageForUpload(processedFile);

    return processedFile;
};

const isHeicFile = (file: File): boolean => {
    const fileName = file.name.toLowerCase();
    return (
        file.type === 'image/heic' ||
        file.type === 'image/heif' ||
        fileName.endsWith('.heic') ||
        fileName.endsWith('.heif')
    );
};

const convertHeicToJpeg = async (file: File): Promise<File> => {
    const convertedBlob = (await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.8,
    })) as Blob;

    const convertedFileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
    return new File([convertedBlob], convertedFileName, {
        type: 'image/jpeg',
        lastModified: Date.now(),
    });
};

const resizeImageForUpload = async (file: File): Promise<File> => {
    const dataURL = await readFileAsDataURL(file);
    const img = await loadImage(dataURL);

    const needsResize = img.width > MAX_IMAGE_DIMENSION_FOR_UPLOAD || img.height > MAX_IMAGE_DIMENSION_FOR_UPLOAD;
    if (!needsResize) {
        return file;
    }

    const canvas = drawImageScaled(img, MAX_IMAGE_DIMENSION_FOR_UPLOAD);
    const blob = await canvasToBlob(canvas, 'image/jpeg', JPEG_QUALITY_FOR_UPLOAD);
    const resizedFileName = file.name.replace(/\.[^.]+$/, '.jpg');
    return blobToFile(blob, resizedFileName, 'image/jpeg');
};

const drawImageScaled = (img: HTMLImageElement, maxSize: number): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    let { width, height } = img;

    if (width > height) {
        if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
        }
    } else {
        if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
        }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(img, 0, 0, width, height);

    return canvas;
};

const yieldToBrowser = (): Promise<void> => {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
};

const resizeImage = async (file: File, maxSize: number): Promise<File> => {
    const dataURL = await readFileAsDataURL(file);
    const img = await loadImage(dataURL);
    const canvas = drawImageOnCanvas(img, maxSize);
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

const drawImageOnCanvas = (img: HTMLImageElement, maxSize: number): HTMLCanvasElement => {
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

const canvasToBlob = (canvas: HTMLCanvasElement, fileType: string, quality?: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error('Canvas to Blob conversion failed.'));
            }
        }, fileType, quality);
    });
};

const blobToFile = (blob: Blob, fileName: string, fileType: string): File => {
    return new File([blob], fileName, { type: fileType });
};

export { cropAndResizeImage, processImageForUpload }