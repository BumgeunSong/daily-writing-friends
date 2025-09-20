import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/firebase';
import { formatDate } from '../utils/dateFormat';

export interface UploadResult {
  url: string;
  fileName: string;
}

export interface UploadError {
  fileName: string;
  error: string;
}

export const uploadFileToFirebase = async (file: File): Promise<UploadResult> => {
  const now = new Date();
  const { dateFolder, timePrefix } = formatDate(now);
  const fileName = `${timePrefix}_${file.name}`;
  const storageRef = ref(storage, `postImages/${dateFolder}/${fileName}`);

  const snapshot = await uploadBytes(storageRef, file);
  const url = await getDownloadURL(snapshot.ref);

  return {
    url,
    fileName: file.name,
  };
};

export const uploadFilesBatch = async (
  files: File[],
  onProgress?: (current: number, fileName: string) => void
): Promise<{
  successes: UploadResult[];
  errors: UploadError[];
}> => {
  const successes: UploadResult[] = [];
  const errors: UploadError[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    try {
      onProgress?.(i + 1, file.name);
      const result = await uploadFileToFirebase(file);
      successes.push(result);
    } catch (error) {
      errors.push({
        fileName: file.name,
        error: error instanceof Error ? error.message : '업로드 실패',
      });
    }
  }

  return { successes, errors };
};