/** A paste/drop item with its file already extracted (see shell note below). */
export interface TransferItem {
  kind: string;
  file: File | null;
}

export interface FileTransferPlan {
  /** Files to upload, in original order. */
  files: File[];
  /** True when we take over the event (preventDefault) instead of letting the editor handle it. */
  shouldClaimEvent: boolean;
}

/**
 * Decides what to do with a paste/drop payload.
 *
 * Shell contract: the caller must call `item.getAsFile()` synchronously inside the event
 * handler, before any `await`. The browser invalidates the DataTransferItemList once the
 * handler yields, so reading items lazily after the first upload would silently lose files.
 */
export function planFileTransfer(items: readonly TransferItem[]): FileTransferPlan {
  const files = items
    .filter((item) => item.kind === 'file')
    .flatMap((item) => (item.file ? [item.file] : []));
  return { files, shouldClaimEvent: files.length > 0 };
}
