import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { quillStyles } from '@/utils/quillStyle';
import { validatePostImageFile, uploadPostImage } from '@/utils/ImageUtils';

interface UseQuillModulesResult {
    quillRef: any;
    modules: any; // TODO: 구체적인 타입 정의 필요
    formats: string[];
    isUploading: boolean;
    uploadProgress: number;
}

export const useQuillModules = (): UseQuillModulesResult => {
    const quillRef = useRef<any>(null);
    const { insertImage } = useInsertImageToEditor({ editor: quillRef.current });
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const imageHandler = useImageHandler({
        onUploadStart: () => setIsUploading(true),
        onUploadProgress: setUploadProgress,
        onUploadComplete: () => {
            setTimeout(() => {
                setIsUploading(false);
                setUploadProgress(0);
            }, 500);
        },
        insertImage: (imageUrl: string) => {
            insertImage(imageUrl);
        }
    });

    

    const { formats, modules } = useQuillConfig(imageHandler);
    useQuillStyles();

    return {
        quillRef,
        modules,
        formats,
        isUploading,
        uploadProgress
    };
};

const useQuillConfig = (imageHandler: (onSuccess: (url: string) => void) => Promise<void>) => {
    const formats = [
        'bold', 'underline', 'strike',
        'blockquote', 'header',
        'list', 'link', 'image'
    ];

    const modules = useMemo(
        () => ({
            toolbar: {
                container: [
                    ['bold', 'underline', 'strike'],
                    ['blockquote'],
                    [{ 'header': 1 }, { 'header': 2 }],
                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                    ['link', 'image'],
                ],
                handlers: {
                    image: imageHandler,
                },
            },
        }),
        [imageHandler]
    );

    return { formats, modules };
};

const useQuillStyles = () => {
    useEffect(() => {
        if (!quillStyles) return;

        const styleTag = document.createElement('style');
        styleTag.textContent = quillStyles;
        document.head.appendChild(styleTag);

        return () => {
            styleTag.remove();
        };
    }, []);
};

interface UseInsertImageToEditorProps {
    editor: any;
}

export const useInsertImageToEditor = ({ editor }: UseInsertImageToEditorProps) => {
    const { toast } = useToast();

    const insertImage = useCallback((imageUrl: string) => {
        if (!editor) {
            console.error('Editor is not initialized');
            return;
        }

        try {
            const range = editor.getSelection(true);
            if (!range) {
                console.error('No selection range found');
                return;
            }

            editor.insertEmbed(range.index, 'image', imageUrl);

            toast({
                title: "성공",
                description: "이미지가 업로드되었습니다.",
            });
        } catch (error) {
            console.error('Image insertion error:', error);
            toast({
                title: "오류",
                description: "이미지 삽입에 실패했습니다.",
                variant: "destructive",
            });
            throw error;
        }
    }, [editor, toast]);

    return { insertImage };
};

interface UseImageHandlerProps {
    onUploadStart: () => void;
    onUploadProgress: (progress: number) => void;
    onUploadComplete: () => void;
    insertImage: (imageUrl: string) => void;
}

export const useImageHandler = ({
    onUploadStart,
    onUploadProgress,
    onUploadComplete,
    insertImage
  }: UseImageHandlerProps) => {
    const { toast } = useToast();
  
    const imageHandler = useCallback(async (onSuccess: (url: string) => void) => {
      const input = document.createElement('input');
      input.setAttribute('type', 'file');
      input.setAttribute('accept', 'image/*');
      input.click();
  
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
  
        try {
          onUploadStart();
          onUploadProgress(0);
  
          validatePostImageFile(file);
          const downloadURL = await uploadPostImage(file, onUploadProgress);
          
          onSuccess(downloadURL);
  
          onUploadProgress(100);
          onUploadComplete();
          insertImage(downloadURL);
        } catch (error) {
          console.error('Image upload error:', error);
          toast({
            title: "오류",
            description: error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.",
            variant: "destructive",
          });
          onUploadComplete();
        }
      };
    }, [toast, onUploadStart, onUploadProgress, onUploadComplete, insertImage]);
  
    return imageHandler;
  };