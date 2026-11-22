import { Extension, ReactRenderer, type Editor, type Range } from '@tiptap/react';
import Suggestion from '@tiptap/suggestion';
import { SlashMenuList, type SlashMenuListHandle } from '@/post/components/SlashMenuList';
import {
  filterSlashMenuItems,
  isSlashTriggerAllowed,
  type SlashMenuItem,
} from '@/post/utils/slashMenuItems';

interface SlashCommandOptions {
  /** 이미지 항목을 골랐을 때 호출한다. */
  onImageRequest: () => void;
  /** 메뉴를 커서 위/아래 어느 쪽에 먼저 띄울지. */
  placement: 'top-start' | 'bottom-start';
}

const assertNever = (id: never): never => {
  throw new Error(`처리되지 않은 슬래시 메뉴 항목: ${String(id)}`);
};

/** 입력한 `/검색어`를 지우고 선택한 블록을 삽입한다. */
export function runSlashCommand(
  editor: Editor,
  range: Range,
  item: SlashMenuItem,
  onImageRequest: () => void,
) {
  const chain = editor.chain().focus().deleteRange(range);
  switch (item.id) {
    case 'image':
      chain.run();
      onImageRequest();
      return;
    case 'heading1':
      return chain.setHeading({ level: 1 }).run();
    case 'heading2':
      return chain.setHeading({ level: 2 }).run();
    case 'quote':
      return chain.setBlockquote().run();
    case 'bulletList':
      return chain.toggleBulletList().run();
    case 'orderedList':
      return chain.toggleOrderedList().run();
    case 'divider':
      return chain.setHorizontalRule().run();
    default:
      return assertNever(item.id);
  }
}

/** 조합 중 keydown의 keyCode. 일부 브라우저는 isComposing 없이 이 값만 보낸다. */
const IME_PROCESS_KEY_CODE = 229;

/** IME 조합 중의 키는 조합기의 것이다. 메뉴가 가로채면 한글 입력이 깨진다. */
export const isComposingKey = (event: KeyboardEvent, viewIsComposing: boolean) =>
  viewIsComposing || event.isComposing || event.keyCode === IME_PROCESS_KEY_CODE;

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',

  addOptions() {
    return { onImageRequest: () => {}, placement: 'bottom-start' };
  },

  addProseMirrorPlugins() {
    const { onImageRequest, placement } = this.options;
    return [
      Suggestion<SlashMenuItem>({
        editor: this.editor,
        char: '/',
        startOfLine: true,
        placement,
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          const { parent } = $from;
          return isSlashTriggerAllowed({
            parentTypeName: parent.type.name,
            parentDepth: $from.depth,
            parentText: parent.textContent,
            triggerText: state.doc.textBetween(range.from, range.to),
          });
        },
        items: ({ query }) => filterSlashMenuItems(query),
        command: ({ editor, range, props }) => runSlashCommand(editor, range, props, onImageRequest),
        render: () => {
          let component: ReactRenderer<SlashMenuListHandle> | null = null;
          let unmount: (() => void) | undefined;
          return {
            onStart: (props) => {
              component = new ReactRenderer(SlashMenuList, { props, editor: props.editor });
              unmount = props.mount?.(component.element as HTMLElement);
            },
            onUpdate: (props) => component?.updateProps(props),
            onKeyDown: (props) => {
              if (isComposingKey(props.event, props.view.composing)) return false;
              return component?.ref?.onKeyDown(props) ?? false;
            },
            onExit: () => {
              unmount?.();
              component?.destroy();
              unmount = undefined;
              component = null;
            },
          };
        },
      }),
    ];
  },
});
