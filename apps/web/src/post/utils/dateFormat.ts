/**
 * Format a Date into zero-padded `YYYYMMDD` + `HHMMSS` parts used in
 * storage paths and post folder names. Kept in its own DOM-free module so
 * pure callers (e.g., storage path builders) don't transitively pull in
 * heavier dependencies like DOMPurify via sanitizeHtml.ts.
 */
export function formatDate(date: Date): { dateFolder: string; timePrefix: string } {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return {
    dateFolder: `${year}${month}${day}`,
    timePrefix: `${hours}${minutes}${seconds}`,
  };
}
