
const cropAndResizeImage = async (file: File, callback: (resizedFile: File) => void) => {
    try {
        const resizedFile = await resizeImage(file, 96);
        callback(resizedFile);
    } catch (error) {
        console.error('Error processing image:', error);
    }
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

const canvasToBlob = (canvas: HTMLCanvasElement, fileType: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error('Canvas to Blob conversion failed.'));
            }
        }, fileType);
    });
};

const blobToFile = (blob: Blob, fileName: string, fileType: string): File => {
    return new File([blob], fileName, { type: fileType });
};

export { cropAndResizeImage }