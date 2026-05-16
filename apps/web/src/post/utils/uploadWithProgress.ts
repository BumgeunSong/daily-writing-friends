import {
  getDownloadURL,
  uploadBytesResumable,
  type StorageReference,
  type UploadMetadata,
} from 'firebase/storage';

interface UploadWithProgressOptions {
  metadata?: UploadMetadata;
  onProgress?: (percent: number) => void;
}

const FULL_PERCENT = 100;

const toError = (reason: unknown): Error =>
  reason instanceof Error ? reason : new Error(String(reason));

const uploadFileWithProgress = (
  storageRef: StorageReference,
  file: File | Blob,
  options: UploadWithProgressOptions = {},
): Promise<string> => {
  const { metadata, onProgress } = options;

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, metadata);

    task.on(
      'state_changed',
      (snapshot) => {
        if (!onProgress || snapshot.totalBytes === 0) return;
        const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * FULL_PERCENT;
        onProgress(percent);
      },
      (error) => reject(toError(error)),
      () => {
        getDownloadURL(task.snapshot.ref)
          .then(resolve)
          .catch((error) => reject(toError(error)));
      },
    );
  });
};

export { uploadFileWithProgress };
