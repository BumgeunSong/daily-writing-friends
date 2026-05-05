interface ShouldSyncEditorContentArgs {
  currentHtml: string;
  currentJsonStr: string;
  targetHtml: string | undefined;
  targetJsonStr: string | undefined;
  isFocused: boolean;
}

export function shouldSyncEditorContent({
  currentHtml,
  currentJsonStr,
  targetHtml,
  targetJsonStr,
  isFocused,
}: ShouldSyncEditorContentArgs): boolean {
  if (targetHtml === undefined && targetJsonStr === undefined) return false;
  if (isFocused) return false;
  if (targetJsonStr !== undefined) {
    return currentJsonStr !== targetJsonStr;
  }
  return currentHtml !== targetHtml;
}
