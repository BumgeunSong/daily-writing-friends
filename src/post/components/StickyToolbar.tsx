import { useState } from 'react';
import type { Editor } from '@tiptap/react';
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
import { cn } from '@/shared/utils/cn';
import { isValidHttpUrl } from '@/post/utils/sanitizeHtml';

interface StickyToolbarProps {
  editor: Editor;
  onImageUpload: () => void;
}

export function StickyToolbar({ editor, onImageUpload }: StickyToolbarProps) {
  const [linkUrl, setLinkUrl] = useState('');
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);

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

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80',
        'px-4 py-2',
        // iOS safe area support
        'pb-[calc(0.5rem+env(safe-area-inset-bottom))]',
      )}
    >
      <div className='mx-auto flex max-w-4xl items-center justify-start overflow-x-auto'>
        {/* Format buttons */}
        <Button
          type='button'
          variant='ghost'
          size='icon'
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            'size-10 shrink-0',
            editor.isActive('bold') && 'bg-accent text-accent-foreground',
          )}
          title='Bold (Ctrl+B)'
        >
          <Bold className='size-5' />
        </Button>

        <Button
          type='button'
          variant='ghost'
          size='icon'
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            'size-10 shrink-0',
            editor.isActive('italic') && 'bg-accent text-accent-foreground',
          )}
          title='Italic (Ctrl+I)'
        >
          <Italic className='size-5' />
        </Button>

        <Button
          type='button'
          variant='ghost'
          size='icon'
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={cn(
            'size-10 shrink-0',
            editor.isActive('strike') && 'bg-accent text-accent-foreground',
          )}
          title='Strikethrough'
        >
          <Strikethrough className='size-5' />
        </Button>

        <div className='mx-1 h-6 w-px bg-border' />

        {/* Heading buttons */}
        <Button
          type='button'
          variant='ghost'
          size='icon'
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={cn(
            'size-10 shrink-0',
            editor.isActive('heading', { level: 1 }) && 'bg-accent text-accent-foreground',
          )}
          title='Heading 1'
        >
          <Heading1 className='size-5' />
        </Button>

        <Button
          type='button'
          variant='ghost'
          size='icon'
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={cn(
            'size-10 shrink-0',
            editor.isActive('heading', { level: 2 }) && 'bg-accent text-accent-foreground',
          )}
          title='Heading 2'
        >
          <Heading2 className='size-5' />
        </Button>

        <div className='mx-1 h-6 w-px bg-border' />

        {/* Block formatting */}
        <Button
          type='button'
          variant='ghost'
          size='icon'
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={cn(
            'size-10 shrink-0',
            editor.isActive('blockquote') && 'bg-accent text-accent-foreground',
          )}
          title='Blockquote'
        >
          <Quote className='size-5' />
        </Button>

        <Button
          type='button'
          variant='ghost'
          size='icon'
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(
            'size-10 shrink-0',
            editor.isActive('bulletList') && 'bg-accent text-accent-foreground',
          )}
          title='Bullet List'
        >
          <List className='size-5' />
        </Button>

        <Button
          type='button'
          variant='ghost'
          size='icon'
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(
            'size-10 shrink-0',
            editor.isActive('orderedList') && 'bg-accent text-accent-foreground',
          )}
          title='Ordered List'
        >
          <ListOrdered className='size-5' />
        </Button>

        <div className='mx-1 h-6 w-px bg-border' />

        {/* Link button with popover */}
        <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              onClick={handleOpenLinkPopover}
              className={cn(
                'size-10 shrink-0',
                editor.isActive('link') && 'bg-accent text-accent-foreground',
              )}
              title='Insert Link'
            >
              <Link2 className='size-5' />
            </Button>
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
        <Button
          type='button'
          variant='ghost'
          size='icon'
          onClick={onImageUpload}
          className='size-10 shrink-0'
          title='Insert Image'
        >
          <ImageIcon className='size-5' />
        </Button>
      </div>
    </div>
  );
}
