import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/firebase';
import { formatDate } from '@/utils/dateUtils';
import { quillStyles } from '@/utils/quillStyle';

export const useQuillModules = () => {
  const quillRef = useRef<any>(null);
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // 이미지 업로드 핸들러
  const imageHandler = useCallback(async () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        setIsUploading(true);
        setUploadProgress(0);

        // 파일 크기 체크 (5MB)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error("파일 크기는 5MB를 초과할 수 없습니다.");
        }

        // 파일 타입 체크
        if (!file.type.startsWith('image/')) {
          throw new Error("이미지 파일만 업로드할 수 있습니다.");
        }

        setUploadProgress(20);

        // 날짜 기반 파일 경로 생성
        const now = new Date();
        const { dateFolder, timePrefix } = formatDate(now);
        const fileName = `${timePrefix}_${file.name}`;
        const storageRef = ref(storage, `postImages/${dateFolder}/${fileName}`);

        setUploadProgress(40);
        const snapshot = await uploadBytes(storageRef, file);
        setUploadProgress(70);
        
        const downloadURL = await getDownloadURL(snapshot.ref);
        setUploadProgress(90);

        // 에디터에 이미지 삽입
        const editor = quillRef.current?.getEditor();
        const range = editor?.getSelection(true);
        editor?.insertEmbed(range?.index, 'image', downloadURL);
        
        setUploadProgress(100);
        toast({
          title: "성공",
          description: "이미지가 업로드되었습니다.",
        });

      } catch (error) {
        console.error('Image upload error:', error);
        toast({
          title: "오류",
          description: error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.",
          variant: "destructive",
        });
      } finally {
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
        }, 500);
      }
    };
  }, [toast]);

  // Quill 포맷 설정
  const formats = [
    'bold', 'underline', 'strike',
    'blockquote', 'header',
    'list', 'link', 'image'
  ];

  // Quill 모듈 설정
  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          ['bold', 'underline', 'strike'],
          ['blockquote'],
          [{ 'header': 1 }, { 'header': 2 }],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          ['link', 'image'],
        ],
        handlers: {
          image: imageHandler,
        },
      },
    }),
    [imageHandler]
  );

  // 스타일 태그 관리
  useEffect(() => {
    if (!quillStyles) return;

    const styleTag = document.createElement('style');
    styleTag.textContent = quillStyles;
    document.head.appendChild(styleTag);

    return () => {
      styleTag.remove();
    };
  }, [quillStyles]);

  return {
    quillRef,
    modules,
    formats,
    isUploading,
    uploadProgress
  };
};
