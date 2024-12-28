import { ref } from "firebase/storage";
import { storage } from "@/firebase";
import { uploadBytes } from "firebase/storage";
import { getDownloadURL } from "firebase/storage";
import { formatDate } from "./dateUtils";

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


// 파일 유효성 검사
const validatePostImageFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
        throw new Error("파일 크기는 5MB를 초과할 수 없습니다.");
    }
    if (!file.type.startsWith('image/')) {
        throw new Error("이미지 파일만 업로드할 수 없습니다.");
    }
};

// 파일 경로 생성
const createStorageRef = (file: File) => {
    const { dateFolder, timePrefix } = formatDate(new Date());
    const fileName = `${timePrefix}_${file.name}`;
    return ref(storage, `postImages/${dateFolder}/${fileName}`);
};

// 이미지 업로드 처리
const uploadPostImage = async (file: File, onProgress: (progress: number) => void) => {
    onProgress(20);
    const storageRef = createStorageRef(file);

    onProgress(40);
    const snapshot = await uploadBytes(storageRef, file);
    onProgress(70);

    const downloadURL = await getDownloadURL(snapshot.ref);
    onProgress(90);

    return downloadURL;
};

export { cropAndResizeImage, uploadPostImage, validatePostImageFile }