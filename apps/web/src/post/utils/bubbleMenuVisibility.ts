interface BubbleMenuVisibilityInput {
  isEmpty: boolean;
  isNodeSelection: boolean;
  /** IME composition in progress (e.g. Korean). */
  isComposing: boolean;
  /** Focus is in the editor or inside the menu itself. */
  hasFocus: boolean;
}

/** Floating format menu shows only for a non-empty text range while the user is working in it. */
export function shouldShowBubbleMenu({
  isEmpty,
  isNodeSelection,
  isComposing,
  hasFocus,
}: BubbleMenuVisibilityInput): boolean {
  return hasFocus && !isEmpty && !isNodeSelection && !isComposing;
}
