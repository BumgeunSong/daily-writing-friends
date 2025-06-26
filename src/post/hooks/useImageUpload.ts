import * as Sentry from '@sentry/react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import heic2any from 'heic2any';
import { useState } from 'react';
import { toast } from 'sonner';
import { storage } from '@/firebase';

interface UseImageUploadProps {
    insertImage: (url: string) => void;
}

export function useImageUpload({ insertImage }: UseImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const imageHandler = async () => {

    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      // Declare processedFile outside try block for catch block access
      let processedFile = file;

      try {
        setIsUploading(true);
        setUploadProgress(0);

        // 파일 크기 체크 (5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error("파일 크기는 5MB를 초과할 수 없습니다.", {
            position: 'bottom-center',
          });
          setIsUploading(false);
          return;
        }

        // HEIC 파일 변환 처리
        if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
          try {
            const convertedBlob = await heic2any({
              blob: file,
              toType: 'image/jpeg',
              quality: 0.8
            }) as Blob;
            
            // Convert blob to file with proper name
            const convertedFileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
            processedFile = new File([convertedBlob], convertedFileName, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
          } catch (conversionError) {
            Sentry.captureException(conversionError, {
              tags: { feature: 'image_upload', operation: 'heic_conversion' },
              extra: { fileName: file.name, fileSize: file.size, fileType: file.type }
            });
            toast.error("HEIC 파일 변환에 실패했습니다.", {
              position: 'bottom-center',
            });
            setIsUploading(false);
            return;
          }
        }

        // 파일 타입 체크 (변환된 파일 기준)
        if (!processedFile.type.startsWith('image/')) {
          toast.error("이미지 파일만 업로드할 수 있습니다.", {
            position: 'bottom-center',
          });
          setIsUploading(false);
          return;
        }

        // 업로드 시작 표시
        setUploadProgress(20);

        // 날짜 기반 파일 경로 생성
        const now = new Date();
        const { dateFolder, timePrefix } = formatDate(now);
        const fileName = `${timePrefix}_${processedFile.name}`;
        const storageRef = ref(storage, `postImages/${dateFolder}/${fileName}`);

        // 파일 업로드
        setUploadProgress(40);
        const snapshot = await uploadBytes(storageRef, processedFile);
        setUploadProgress(70);

        // URL 가져오기
        const downloadURL = await getDownloadURL(snapshot.ref);
        setUploadProgress(90);

        // 에디터에 이미지 삽입
        insertImage(downloadURL);

        setUploadProgress(100);
        toast.success("이미지가 업로드되었습니다.", {
          position: 'bottom-center',
        });

      } catch (error) {
        setIsUploading(false);
        Sentry.captureException(error, {
          tags: { feature: 'image_upload', operation: 'upload_process' },
          extra: { fileName: processedFile?.name, fileSize: processedFile?.size, fileType: processedFile?.type }
        });
        toast.error("이미지 업로드에 실패했습니다.", {
          position: 'bottom-center',
        });
      } finally {
        // 약간의 딜레이 후 로딩 상태 초기화
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
        }, 500);
      }
    };
  };

  return { imageHandler, isUploading, uploadProgress };
} 


const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
  
    return {
      dateFolder: `${year}${month}${day}`,
      timePrefix: `${hours}${minutes}${seconds}`
    };
  };