const ELLIPSIS = "...";
const ELLIPSIS_LENGTH = ELLIPSIS.length;
const MIN_LENGTH_FOR_ELLIPSIS = 4;

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  if (maxLength < MIN_LENGTH_FOR_ELLIPSIS) return text.slice(0, maxLength);
  return text.slice(0, maxLength - ELLIPSIS_LENGTH) + ELLIPSIS;
}
