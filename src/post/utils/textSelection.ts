import type { TextSelection } from '../types/nativeEditor';

export function getSelection(textarea: HTMLTextAreaElement): TextSelection {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value.substring(start, end);
  
  return {
    start,
    end,
    text,
    isEmpty: start === end,
  };
}

export function setSelection(
  textarea: HTMLTextAreaElement, 
  start: number, 
  end: number = start
): void {
  textarea.focus();
  textarea.setSelectionRange(start, end);
}

export function insertText(
  textarea: HTMLTextAreaElement, 
  text: string,
  selectInserted: boolean = false
): void {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  
  const newValue = value.substring(0, start) + text + value.substring(end);
  textarea.value = newValue;
  
  // Trigger change event for React
  const event = new Event('input', { bubbles: true });
  textarea.dispatchEvent(event);
  
  // Set cursor position
  const newCursorPos = selectInserted 
    ? start + text.length 
    : start + text.length;
  
  setTimeout(() => {
    if (selectInserted) {
      setSelection(textarea, start, start + text.length);
    } else {
      setSelection(textarea, newCursorPos);
    }
  }, 0);
}

export function replaceSelection(
  textarea: HTMLTextAreaElement, 
  replacement: string,
  selectReplacement: boolean = false
): void {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  
  const newValue = value.substring(0, start) + replacement + value.substring(end);
  textarea.value = newValue;
  
  // Trigger change event for React
  const event = new Event('input', { bubbles: true });
  textarea.dispatchEvent(event);
  
  // Set cursor position
  setTimeout(() => {
    if (selectReplacement) {
      setSelection(textarea, start, start + replacement.length);
    } else {
      setSelection(textarea, start + replacement.length);
    }
  }, 0);
}

export function wrapSelectedText(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string = before
): void {
  const selection = getSelection(textarea);
  
  if (selection.isEmpty) {
    // No selection - insert wrapper and position cursor inside
    insertText(textarea, before + after);
    setTimeout(() => {
      setSelection(textarea, selection.start + before.length);
    }, 0);
  } else {
    // Has selection - wrap it
    const wrappedText = before + selection.text + after;
    replaceSelection(textarea, wrappedText);
    setTimeout(() => {
      setSelection(textarea, 
        selection.start + before.length, 
        selection.start + before.length + selection.text.length
      );
    }, 0);
  }
}

export function toggleLinePrefix(
  textarea: HTMLTextAreaElement,
  prefix: string
): void {
  const selection = getSelection(textarea);
  const value = textarea.value;
  
  // Find line boundaries
  const lineStart = value.lastIndexOf('\n', selection.start - 1) + 1;
  const lineEnd = value.indexOf('\n', selection.end);
  const actualLineEnd = lineEnd === -1 ? value.length : lineEnd;
  
  const line = value.substring(lineStart, actualLineEnd);
  
  let newLine: string;
  let cursorOffset = 0;
  
  if (line.startsWith(prefix)) {
    // Remove prefix
    newLine = line.substring(prefix.length);
    cursorOffset = -prefix.length;
  } else {
    // Add prefix
    newLine = prefix + line;
    cursorOffset = prefix.length;
  }
  
  // Replace the line
  const newValue = value.substring(0, lineStart) + newLine + value.substring(actualLineEnd);
  textarea.value = newValue;
  
  // Trigger change event for React
  const event = new Event('input', { bubbles: true });
  textarea.dispatchEvent(event);
  
  // Adjust cursor position
  setTimeout(() => {
    const newStart = Math.max(lineStart, selection.start + cursorOffset);
    const newEnd = selection.isEmpty ? newStart : selection.end + cursorOffset;
    setSelection(textarea, newStart, newEnd);
  }, 0);
}

export function getCurrentLine(textarea: HTMLTextAreaElement): {
  text: string;
  start: number;
  end: number;
} {
  const cursorPos = textarea.selectionStart;
  const value = textarea.value;
  
  const lineStart = value.lastIndexOf('\n', cursorPos - 1) + 1;
  const lineEnd = value.indexOf('\n', cursorPos);
  const actualLineEnd = lineEnd === -1 ? value.length : lineEnd;
  
  return {
    text: value.substring(lineStart, actualLineEnd),
    start: lineStart,
    end: actualLineEnd,
  };
}

export function insertAtLineStart(
  textarea: HTMLTextAreaElement,
  text: string
): void {
  const line = getCurrentLine(textarea);
  const newValue = textarea.value.substring(0, line.start) + 
                  text + 
                  textarea.value.substring(line.start);
  
  textarea.value = newValue;
  
  // Trigger change event for React
  const event = new Event('input', { bubbles: true });
  textarea.dispatchEvent(event);
  
  // Position cursor after inserted text
  setTimeout(() => {
    const newCursorPos = textarea.selectionStart + text.length;
    setSelection(textarea, newCursorPos);
  }, 0);
}

export function getWordAtCursor(textarea: HTMLTextAreaElement): {
  word: string;
  start: number;
  end: number;
} {
  const cursorPos = textarea.selectionStart;
  const value = textarea.value;
  
  // Find word boundaries
  const wordPattern = /\w+/g;
  let match;
  
  while ((match = wordPattern.exec(value)) !== null) {
    if (match.index <= cursorPos && cursorPos <= match.index + match[0].length) {
      return {
        word: match[0],
        start: match.index,
        end: match.index + match[0].length,
      };
    }
  }
  
  return {
    word: '',
    start: cursorPos,
    end: cursorPos,
  };
}