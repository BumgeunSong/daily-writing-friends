export type EditorSyncAction =
  | { kind: 'skip' }
  | { kind: 'recordOnly'; signature: string }
  | { kind: 'sync'; signature: string };

interface DecideEditorContentSyncArgs {
  currentSanitizedHtml: string;
  currentJsonStr: string;
  targetHtml: string | undefined;
  targetJsonStr: string | undefined;
  isFocused: boolean;
  lastSyncedSignature: string | null;
}

export function decideEditorContentSync({
  currentSanitizedHtml,
  currentJsonStr,
  targetHtml,
  targetJsonStr,
  isFocused,
  lastSyncedSignature,
}: DecideEditorContentSyncArgs): EditorSyncAction {
  if (targetHtml === undefined && targetJsonStr === undefined) {
    return { kind: 'skip' };
  }
  const usingJson = targetJsonStr !== undefined;
  const signature = usingJson ? targetJsonStr : (targetHtml ?? '');
  // Same target as last sync → skip. Without this, blur during the 300ms
  // onChange debounce would push lagging parent state back into the editor and
  // wipe the user's in-flight keystrokes.
  if (signature === lastSyncedSignature) return { kind: 'skip' };
  // Editor already shows the target (e.g., right after onChange caught up, or
  // when the Image extension's class attr is the only diff and sanitize strips
  // it). Record the signature so future calls short-circuit; no setContent.
  const currentSignature = usingJson ? currentJsonStr : currentSanitizedHtml;
  if (signature === currentSignature) return { kind: 'recordOnly', signature };
  if (isFocused) return { kind: 'skip' };
  return { kind: 'sync', signature };
}
