import { useCallback, useEffect, useState, useRef } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough,
  Quote,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Link,
  Image,
  Loader2
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Progress } from '@/shared/ui/progress';
import type { StickyToolbarProps, ToolbarButtonState } from '../types/quillEditor';

const toolbarStyles = `
.quill-sticky-toolbar {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 50;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  padding: 0.75rem;
  box-shadow: 0 -4px 6px -1px rgb(0 0 0 / 0.1);
}

@media (min-width: 768px) {
  .quill-sticky-toolbar {
    position: sticky;
    top: 0;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    border-top: none;
    border-bottom: 1px solid hsl(var(--border));
  }
}

.toolbar-fade-in {
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

export function QuillStickyToolbar({ 
  quillRef, 
  isUploading, 
  uploadProgress, 
  onImageUpload 
}: StickyToolbarProps) {
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [buttonStates, setButtonStates] = useState<ToolbarButtonState>({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    blockquote: false,
    header: false,
    list: false,
  });
  const [isMobile, setIsMobile] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Inject styles
  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.textContent = toolbarStyles;
    document.head.appendChild(styleTag);

    return () => {
      styleTag.remove();
    };
  }, []);

  // Handle editor focus/blur to show/hide toolbar on mobile
  useEffect(() => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    const handleFocus = () => {
      if (isMobile) {
        setTimeout(() => setToolbarVisible(true), 100);
      } else {
        setToolbarVisible(true);
      }
    };

    const handleBlur = () => {
      // Delay hiding to prevent flickering when clicking toolbar buttons
      setTimeout(() => {
        if (!toolbarRef.current?.contains(document.activeElement)) {
          if (isMobile) {
            setToolbarVisible(false);
          }
        }
      }, 150);
    };

    const editorElement = editor.root;
    editorElement.addEventListener('focus', handleFocus);
    editorElement.addEventListener('blur', handleBlur);

    return () => {
      editorElement.removeEventListener('focus', handleFocus);
      editorElement.removeEventListener('blur', handleBlur);
    };
  }, [quillRef, isMobile]);

  // Update button states based on cursor position
  const updateToolbarState = useCallback(() => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    const range = editor.getSelection();
    if (!range) return;

    const format = editor.getFormat(range);
    
    setButtonStates({
      bold: !!format.bold,
      italic: !!format.italic,
      underline: !!format.underline,
      strike: !!format.strike,
      blockquote: !!format.blockquote,
      header: format.header || false,
      list: format.list || false,
    });
  }, [quillRef]);

  // Listen to editor selection changes
  useEffect(() => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    const handleSelectionChange = () => updateToolbarState();
    editor.on('selection-change', handleSelectionChange);

    return () => {
      editor.off('selection-change', handleSelectionChange);
    };
  }, [quillRef, updateToolbarState]);

  const formatText = useCallback((format: string, value?: any) => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    const range = editor.getSelection();
    if (!range) return;

    if (value !== undefined) {
      editor.format(format, value);
    } else {
      const currentFormat = editor.getFormat(range);
      editor.format(format, !currentFormat[format]);
    }
    
    updateToolbarState();
  }, [quillRef, updateToolbarState]);

  const insertLink = useCallback(() => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    const range = editor.getSelection();
    if (!range) return;

    const url = prompt('링크 URL을 입력하세요:');
    if (url) {
      if (range.length === 0) {
        const linkText = prompt('링크 텍스트를 입력하세요:') || url;
        editor.insertText(range.index, linkText, 'link', url);
      } else {
        editor.format('link', url);
      }
    }
    updateToolbarState();
  }, [quillRef, updateToolbarState]);

  if (!toolbarVisible && isMobile) return null;

  const toolbarClass = `quill-sticky-toolbar toolbar-fade-in ${
    isMobile ? 'bottom-0' : 'top-0'
  }`;

  return (
    <div ref={toolbarRef} className={toolbarClass}>
      {/* Upload Progress */}
      {isUploading && (
        <div className="mb-3">
          <Progress value={uploadProgress} className="h-1" />
          <p className="text-xs text-center mt-1 text-muted-foreground">
            이미지 업로드 중... {uploadProgress}%
          </p>
        </div>
      )}

      {/* Toolbar Buttons */}
      <div className="flex flex-wrap items-center gap-1 justify-center">
        <Button
          variant={buttonStates.bold ? "default" : "ghost"}
          size="sm"
          onClick={() => formatText('bold')}
          disabled={isUploading}
          className="h-8 w-8 p-0"
        >
          <Bold className="h-4 w-4" />
        </Button>

        <Button
          variant={buttonStates.italic ? "default" : "ghost"}
          size="sm"
          onClick={() => formatText('italic')}
          disabled={isUploading}
          className="h-8 w-8 p-0"
        >
          <Italic className="h-4 w-4" />
        </Button>

        <Button
          variant={buttonStates.underline ? "default" : "ghost"}
          size="sm"
          onClick={() => formatText('underline')}
          disabled={isUploading}
          className="h-8 w-8 p-0"
        >
          <Underline className="h-4 w-4" />
        </Button>

        <Button
          variant={buttonStates.strike ? "default" : "ghost"}
          size="sm"
          onClick={() => formatText('strike')}
          disabled={isUploading}
          className="h-8 w-8 p-0"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>

        <div className="h-4 w-px bg-border mx-1" />

        <Button
          variant={buttonStates.blockquote ? "default" : "ghost"}
          size="sm"
          onClick={() => formatText('blockquote')}
          disabled={isUploading}
          className="h-8 w-8 p-0"
        >
          <Quote className="h-4 w-4" />
        </Button>

        <Button
          variant={buttonStates.header === 1 ? "default" : "ghost"}
          size="sm"
          onClick={() => formatText('header', buttonStates.header === 1 ? false : 1)}
          disabled={isUploading}
          className="h-8 w-8 p-0"
        >
          <Heading1 className="h-4 w-4" />
        </Button>

        <Button
          variant={buttonStates.header === 2 ? "default" : "ghost"}
          size="sm"
          onClick={() => formatText('header', buttonStates.header === 2 ? false : 2)}
          disabled={isUploading}
          className="h-8 w-8 p-0"
        >
          <Heading2 className="h-4 w-4" />
        </Button>

        <div className="h-4 w-px bg-border mx-1" />

        <Button
          variant={buttonStates.list === 'bullet' ? "default" : "ghost"}
          size="sm"
          onClick={() => formatText('list', buttonStates.list === 'bullet' ? false : 'bullet')}
          disabled={isUploading}
          className="h-8 w-8 p-0"
        >
          <List className="h-4 w-4" />
        </Button>

        <Button
          variant={buttonStates.list === 'ordered' ? "default" : "ghost"}
          size="sm"
          onClick={() => formatText('list', buttonStates.list === 'ordered' ? false : 'ordered')}
          disabled={isUploading}
          className="h-8 w-8 p-0"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="h-4 w-px bg-border mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={insertLink}
          disabled={isUploading}
          className="h-8 w-8 p-0"
        >
          <Link className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onImageUpload}
          disabled={isUploading}
          className="h-8 w-8 p-0"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Image className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}