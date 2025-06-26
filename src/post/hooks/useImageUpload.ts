import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useState } from 'react';
import { storage } from '@/firebase';
import { useToast } from '@/shared/hooks/use-toast';
import heic2any from 'heic2any';

interface UseImageUploadProps {
    insertImage: (url: string) => void;
}

export function useImageUpload({ insertImage }: UseImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const imageHandler = async () => {
    console.log("🚀 ~ imageHandler ~ imageHandler:", imageHandler);

    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        console.log("File selected:", file.name, "Size:", file.size, "Type:", file.type);
        setIsUploading(true);
        setUploadProgress(0);

        // 파일 크기 체크 (5MB)
        if (file.size > 5 * 1024 * 1024) {
          console.log("File size exceeds 5MB limit.");
          toast({
            title: "오류",
            description: "파일 크기는 5MB를 초과할 수 없습니다.",
            variant: "destructive",
          });
          return;
        }

        // HEIC 파일 변환 처리
        let processedFile = file;
        if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
          console.log("Converting HEIC file to JPEG...");
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
            console.log("HEIC conversion completed.");
          } catch (conversionError) {
            console.error('HEIC conversion failed:', conversionError);
            toast({
              title: "오류",
              description: "HEIC 파일 변환에 실패했습니다.",
              variant: "destructive",
            });
            return;
          }
        }

        // 파일 타입 체크 (변환된 파일 기준)
        if (!processedFile.type.startsWith('image/')) {
          console.log("File type is not an image.");
          toast({
            title: "오류",
            description: "이미지 파일만 업로드할 수 있습니다.",
            variant: "destructive",
          });
          return;
        }

        // 업로드 시작 표시
        setUploadProgress(20);
        console.log("Upload started.");

        // 날짜 기반 파일 경로 생성
        const now = new Date();
        const { dateFolder, timePrefix } = formatDate(now);
        const fileName = `${timePrefix}_${processedFile.name}`;
        const storageRef = ref(storage, `postImages/${dateFolder}/${fileName}`);

        // 파일 업로드
        setUploadProgress(40);
        console.log("Uploading file to storage...");
        const snapshot = await uploadBytes(storageRef, processedFile);
        setUploadProgress(70);
        console.log("File uploaded successfully.");

        // URL 가져오기
        const downloadURL = await getDownloadURL(snapshot.ref);
        setUploadProgress(90);
        console.log("Download URL obtained:", downloadURL);

        // 에디터에 이미지 삽입
        insertImage(downloadURL);

        setUploadProgress(100);
        toast({
          title: "성공",
          description: "이미지가 업로드되었습니다.",
        });

      } catch (error) {
        console.error('Image upload error:', error);
        toast({
          title: "오류",
          description: "이미지 업로드에 실패했습니다.",
          variant: "destructive",
        });
      } finally {
        // 약간의 딜레이 후 로딩 상태 초기화
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
          console.log("Upload process completed.");
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