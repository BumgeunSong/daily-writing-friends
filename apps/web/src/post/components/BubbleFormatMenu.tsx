import { NodeSelection, PluginKey } from '@tiptap/pm/state';
import type { EditorState } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { useEditorState, type Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Link2,
  Check,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { useLinkEditor } from '@/post/hooks/useLinkEditor';
import { shouldShowBubbleMenu } from '@/post/utils/bubbleMenuVisibility';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { ToolbarButton } from './ToolbarButton';

/** Explicit key so the menu can be hidden by transaction meta (a string key would not match). */
const BUBBLE_MENU_KEY = new PluginKey('formatBubbleMenu');

// Module-level so BubbleMenu does not dispatch an options-update transaction on every render.
const BUBBLE_PLACEMENT = { placement: 'top', offset: 8, flip: true, shift: { padding: 8 } } as const;

function shouldShowFormatMenu({ state, view, element }: { state: EditorState; view: EditorView; element: HTMLElement }) {
  return shouldShowBubbleMenu({
    isEmpty: state.selection.empty,
    isNodeSelection: state.selection instanceof NodeSelection,
    isComposing: view.composing,
    hasFocus: view.hasFocus() || element.contains(document.activeElement),
  });
}

interface BubbleFormatMenuProps {
  editor: Editor;
}

/**
 * Floating format menu shown above a text selection (desktop only; the caller
 * decides when to mount it). Complements the fixed EditorToolbar.
 */
export function BubbleFormatMenu({ editor }: BubbleFormatMenuProps) {
  const link = useLinkEditor(editor);
  const cancelLinkRef = useRef(link.cancel);
  cancelLinkRef.current = link.cancel;
  const bubbleOptions = useMemo(
    () => ({ ...BUBBLE_PLACEMENT, onHide: () => cancelLinkRef.current() }),
    [],
  );
  const cancelLinkEditing = () => {
    link.cancel();
    editor.commands.focus();
  };
  const submitLink = () => {
    if (!link.isInvalid) link.apply();
  };
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (link.isOpen) urlInputRef.current?.focus();
  }, [link.isOpen]);

  const active = useEditorState({
    editor,
    selector: ctx => ({
      isBold: ctx.editor.isActive('bold'),
      isItalic: ctx.editor.isActive('italic'),
      isUnderline: ctx.editor.isActive('underline'),
      isStrike: ctx.editor.isActive('strike'),
      isHeading2: ctx.editor.isActive('heading', { level: 2 }),
      isLink: ctx.editor.isActive('link'),
    }),
  });

  return (
    <BubbleMenu
      editor={editor}
      pluginKey={BUBBLE_MENU_KEY}
      options={bubbleOptions}
      shouldShow={shouldShowFormatMenu}
      onMouseDown={(e) => {
        // Keep editor focus on button clicks (Safari does not focus buttons); the URL input needs its own focus.
        if (!(e.target instanceof HTMLInputElement)) e.preventDefault();
      }}
      className='z-50 flex items-center gap-0.5 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md'
      data-testid='bubble-format-menu'
    >
      {link.isOpen ? (
        <div
          className='w-72'
          onBlur={(e) => {
            if (e.currentTarget.contains(e.relatedTarget)) return;
            link.cancel();
            // Focus left the menu for somewhere outside the editor; the plugin only hides on editor blur.
            editor.view.dispatch(editor.state.tr.setMeta(BUBBLE_MENU_KEY, 'hide'));
          }}
        >
          <div className='flex items-center gap-1'>
            <Input
              type='url'
              ref={urlInputRef}
              placeholder='https://example.com'
              aria-label='링크 URL'
              aria-invalid={link.isInvalid}
              value={link.linkUrl}
              onChange={(e) => link.setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  submitLink();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  cancelLinkEditing();
                }
              }}
              className='h-9 flex-1'
            />
            <Button type='button' size='icon' variant='ghost' aria-label='링크 적용' onClick={submitLink} className='size-9 shrink-0'>
              <Check className='size-4' />
            </Button>
            <Button type='button' size='icon' variant='ghost' aria-label='링크 편집 취소' onClick={cancelLinkEditing} className='size-9 shrink-0'>
              <X className='size-4' />
            </Button>
          </div>
          {link.isInvalid && (
            <p role='alert' className='px-1 pt-1 text-xs text-muted-foreground'>
              URL은 http:// 또는 https://로 시작해야 합니다
            </p>
          )}
        </div>
      ) : (
        <>
          <ToolbarButton
            isActive={active.isBold}
            onClick={() => editor.chain().focus().toggleBold().run()}
            icon={<Bold className='size-4' />}
            title='Bold (Ctrl+B)'
            ariaLabel='Bold'
            className='size-9'
            data-testid='bubble-bold'
          />
          <ToolbarButton
            isActive={active.isItalic}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            icon={<Italic className='size-4' />}
            title='Italic (Ctrl+I)'
            ariaLabel='Italic'
            className='size-9'
            data-testid='bubble-italic'
          />
          <ToolbarButton
            isActive={active.isUnderline}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            icon={<UnderlineIcon className='size-4' />}
            title='Underline (Ctrl+U)'
            ariaLabel='Underline'
            className='size-9'
            data-testid='bubble-underline'
          />
          <ToolbarButton
            isActive={active.isStrike}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            icon={<Strikethrough className='size-4' />}
            title='Strikethrough'
            ariaLabel='Strikethrough'
            className='size-9'
            data-testid='bubble-strike'
          />
          <ToolbarButton
            isActive={active.isHeading2}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            icon={<Heading2 className='size-4' />}
            title='Heading 2'
            ariaLabel='Heading 2'
            className='size-9'
            data-testid='bubble-h2'
          />
          <div className='mx-1 h-5 w-px bg-border' />
          <ToolbarButton
            isActive={active.isLink}
            onClick={link.open}
            icon={<Link2 className='size-4' />}
            title='Link'
            ariaLabel='Link'
            className='size-9'
            data-testid='bubble-link'
          />
        </>
      )}
    </BubbleMenu>
  );
}
