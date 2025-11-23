import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import { useEditorState } from '@tiptap/react';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Quote,
  List,
  ListOrdered,
  Link2,
  Image as ImageIcon,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { Input } from '@/shared/ui/input';
import { isValidHttpUrl } from '@/post/utils/sanitizeHtml';
import { cn } from '@/shared/utils/cn';
import { useScrollIndicators } from '@/post/hooks/useScrollIndicators';
import { ToolbarButton } from './ToolbarButton';

interface EditorToolbarProps {
  editor: Editor;
  onImageUpload: () => void;
  variant?: 'sticky' | 'inline';
}

export function EditorToolbar({ editor, onImageUpload, variant = 'sticky' }: EditorToolbarProps) {
  const [linkUrl, setLinkUrl] = useState('');
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
  const { scrollContainerRef, canScrollLeft, canScrollRight } = useScrollIndicators();

  // Use TipTap's useEditorState for optimized re-renders
  const editorState = useEditorState({
    editor,
    selector: ctx => ({
      isBold: ctx.editor.isActive('bold'),
      isItalic: ctx.editor.isActive('italic'),
      isStrike: ctx.editor.isActive('strike'),
      isHeading1: ctx.editor.isActive('heading', { level: 1 }),
      isHeading2: ctx.editor.isActive('heading', { level: 2 }),
      isBlockquote: ctx.editor.isActive('blockquote'),
      isBulletList: ctx.editor.isActive('bulletList'),
      isOrderedList: ctx.editor.isActive('orderedList'),
      isLink: ctx.editor.isActive('link'),
    }),
  });

  const handleSetLink = () => {
    if (!linkUrl) {
      // Remove link
      editor.chain().focus().unsetLink().run();
    } else if (isValidHttpUrl(linkUrl)) {
      // Set link with proper protocol
      const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
      editor.chain().focus().setLink({ href: url }).run();
    }
    setLinkUrl('');
    setIsLinkPopoverOpen(false);
  };

  const handleOpenLinkPopover = () => {
    // Get current link if any
    const currentLink = editor.getAttributes('link').href || '';
    setLinkUrl(currentLink);
    setIsLinkPopoverOpen(true);
  };

  const containerClass = variant === 'sticky' 
    ? cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80',
        'px-4 py-2',
        // iOS safe area support
        'pb-[calc(0.5rem+env(safe-area-inset-bottom))]',
      )
    : cn(
        'relative w-full',
        'border-y bg-background/95',
        'px-4 py-2 my-4',
      );

  return (
    <div className={containerClass}>
      <div className='relative mx-auto max-w-4xl'>
        {/* Left gradient indicator */}
        {canScrollLeft && (
          <div className='pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background/95 to-transparent' />
        )}

        {/* Right gradient indicator */}
        {canScrollRight && (
          <div className='pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background/95 to-transparent' />
        )}

        <div
          ref={scrollContainerRef}
          className='flex items-center justify-start overflow-x-auto [&::-webkit-scrollbar]:hidden'
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Format buttons */}
          <ToolbarButton
            isActive={editorState.isBold}
            onClick={() => editor.chain().focus().toggleBold().run()}
            icon={<Bold className='size-5' />}
            title='Bold (Ctrl+B)'
            ariaLabel='Bold'
          />

          <ToolbarButton
            isActive={editorState.isItalic}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            icon={<Italic className='size-5' />}
            title='Italic (Ctrl+I)'
            ariaLabel='Italic'
          />

          <ToolbarButton
            isActive={editorState.isStrike}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            icon={<Strikethrough className='size-5' />}
            title='Strikethrough'
            ariaLabel='Strikethrough'
          />

          <div className='mx-1 h-6 w-px bg-border' />

          {/* Heading buttons */}
          <ToolbarButton
            isActive={editorState.isHeading1}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            icon={<Heading1 className='size-5' />}
            title='Heading 1'
            ariaLabel='Heading 1'
          />

          <ToolbarButton
            isActive={editorState.isHeading2}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            icon={<Heading2 className='size-5' />}
            title='Heading 2'
            ariaLabel='Heading 2'
          />

          <div className='mx-1 h-6 w-px bg-border' />

          {/* Block formatting */}
          <ToolbarButton
            isActive={editorState.isBlockquote}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            icon={<Quote className='size-5' />}
            title='Blockquote'
            ariaLabel='Blockquote'
          />

          <ToolbarButton
            isActive={editorState.isBulletList}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            icon={<List className='size-5' />}
            title='Bullet List'
            ariaLabel='Bullet List'
          />

          <ToolbarButton
            isActive={editorState.isOrderedList}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            icon={<ListOrdered className='size-5' />}
            title='Ordered List'
            ariaLabel='Ordered List'
          />

          <div className='mx-1 h-6 w-px bg-border' />

          {/* Link button with popover */}
          <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
            <PopoverTrigger asChild>
              <div>
                <ToolbarButton
                  isActive={editorState.isLink}
                  onClick={handleOpenLinkPopover}
                  icon={<Link2 className='size-5' />}
                  title='Insert Link'
                  ariaLabel='Insert Link'
                />
              </div>
            </PopoverTrigger>
            <PopoverContent className='w-80' align='start'>
              <div className='space-y-2'>
                <p className='text-sm font-medium'>링크 URL</p>
                <div className='flex gap-2'>
                  <Input
                    type='url'
                    placeholder='https://example.com'
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSetLink();
                      }
                    }}
                    className='flex-1'
                  />
                  <Button
                    type='button'
                    size='icon'
                    variant='ghost'
                    onClick={handleSetLink}
                    className='shrink-0'
                  >
                    <Check className='size-4' />
                  </Button>
                  <Button
                    type='button'
                    size='icon'
                    variant='ghost'
                    onClick={() => {
                      setLinkUrl('');
                      setIsLinkPopoverOpen(false);
                    }}
                    className='shrink-0'
                  >
                    <X className='size-4' />
                  </Button>
                </div>
                {linkUrl && !isValidHttpUrl(linkUrl) && !linkUrl.startsWith('http') && (
                  <p className='text-xs text-muted-foreground'>
                    URL은 http:// 또는 https://로 시작해야 합니다
                  </p>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Image button */}
          <ToolbarButton
            isActive={false}
            onClick={onImageUpload}
            icon={<ImageIcon className='size-5' />}
            title='Insert Image'
            ariaLabel='Insert Image'
          />
        </div>
      </div>
    </div>
  );
}
