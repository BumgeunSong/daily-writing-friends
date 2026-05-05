interface ShouldSyncEditorContentArgs {
  currentHtml: string;
  targetHtml: string | undefined;
  isFocused: boolean;
}

export function shouldSyncEditorContent({
  currentHtml,
  targetHtml,
  isFocused,
}: ShouldSyncEditorContentArgs): boolean {
  if (targetHtml === undefined) return false;
  if (targetHtml === '') return false;
  if (isFocused) return false;
  return currentHtml !== targetHtml;
}
