import type { FormatState, MarkdownPattern } from '../types/nativeEditor';

export function wrapText(text: string, wrapper: string, allowNested: boolean = false): string {
  if (!allowNested && text.startsWith(wrapper) && text.endsWith(wrapper)) {
    // Remove wrapper if already wrapped
    return text.substring(wrapper.length, text.length - wrapper.length);
  }
  return wrapper + text + wrapper;
}

export function toggleLinePrefix(lines: string[], prefix: string): string[] {
  // Check if all lines start with the prefix
  const allHavePrefix = lines.every(line => 
    line.trim() === '' || line.startsWith(prefix)
  );
  
  if (allHavePrefix) {
    // Remove prefix from all lines
    return lines.map(line => 
      line.startsWith(prefix) ? line.substring(prefix.length) : line
    );
  } else {
    // Add prefix to all non-empty lines
    return lines.map(line => 
      line.trim() === '' ? line : prefix + line
    );
  }
}

export function detectFormatAtPosition(text: string, position: number): Partial<FormatState> {
  const formatState: Partial<FormatState> = {};
  
  // Find the current line
  const lineStart = text.lastIndexOf('\n', position - 1) + 1;
  const lineEnd = text.indexOf('\n', position);
  const actualLineEnd = lineEnd === -1 ? text.length : lineEnd;
  const currentLine = text.substring(lineStart, actualLineEnd);
  
  // Check line-based formats
  formatState.isHeading1 = currentLine.startsWith('# ');
  formatState.isHeading2 = currentLine.startsWith('## ');
  formatState.isBlockquote = currentLine.startsWith('> ');
  formatState.isBulletList = /^\s*[-*+]\s/.test(currentLine);
  formatState.isOrderedList = /^\s*\d+\.\s/.test(currentLine);
  
  // Check inline formats around cursor
  formatState.isBold = isTextWrappedAt(text, position, '**');
  formatState.isItalic = isTextWrappedAt(text, position, '*');
  formatState.isStrike = isTextWrappedAt(text, position, '~~');
  formatState.isLink = isInsideLinkAt(text, position);
  
  return formatState;
}

function isTextWrappedAt(text: string, position: number, wrapper: string): boolean {
  const wrapperLength = wrapper.length;
  
  // Look backwards for opening wrapper
  let beforePos = position - wrapperLength;
  while (beforePos >= 0) {
    if (text.substring(beforePos, beforePos + wrapperLength) === wrapper) {
      // Found opening wrapper, look for closing wrapper after cursor
      let afterPos = position;
      while (afterPos <= text.length - wrapperLength) {
        if (text.substring(afterPos, afterPos + wrapperLength) === wrapper) {
          return true;
        }
        afterPos++;
      }
      break;
    }
    beforePos--;
  }
  
  return false;
}

function isInsideLinkAt(text: string, position: number): boolean {
  // Look for link pattern [text](url) around cursor
  const linkPattern = /\[([^\]]*)\]\(([^)]*)\)/g;
  let match;
  
  while ((match = linkPattern.exec(text)) !== null) {
    const linkStart = match.index;
    const linkEnd = match.index + match[0].length;
    
    if (linkStart <= position && position <= linkEnd) {
      return true;
    }
  }
  
  return false;
}

export function formatBoldText(text: string, start: number, end: number): {
  newText: string;
  newStart: number;
  newEnd: number;
} {
  const selectedText = text.substring(start, end);
  const wrapper = '**';
  
  if (selectedText.startsWith(wrapper) && selectedText.endsWith(wrapper)) {
    // Remove bold formatting
    const unwrapped = selectedText.substring(wrapper.length, selectedText.length - wrapper.length);
    const newText = text.substring(0, start) + unwrapped + text.substring(end);
    return {
      newText,
      newStart: start,
      newEnd: start + unwrapped.length,
    };
  } else {
    // Add bold formatting
    const wrapped = wrapper + selectedText + wrapper;
    const newText = text.substring(0, start) + wrapped + text.substring(end);
    return {
      newText,
      newStart: start + wrapper.length,
      newEnd: end + wrapper.length,
    };
  }
}

export function formatItalicText(text: string, start: number, end: number): {
  newText: string;
  newStart: number;
  newEnd: number;
} {
  const selectedText = text.substring(start, end);
  const wrapper = '*';
  
  if (selectedText.startsWith(wrapper) && selectedText.endsWith(wrapper) && 
      !selectedText.startsWith('**') && !selectedText.endsWith('**')) {
    // Remove italic formatting (but not if it's bold)
    const unwrapped = selectedText.substring(1, selectedText.length - 1);
    const newText = text.substring(0, start) + unwrapped + text.substring(end);
    return {
      newText,
      newStart: start,
      newEnd: start + unwrapped.length,
    };
  } else {
    // Add italic formatting
    const wrapped = wrapper + selectedText + wrapper;
    const newText = text.substring(0, start) + wrapped + text.substring(end);
    return {
      newText,
      newStart: start + wrapper.length,
      newEnd: end + wrapper.length,
    };
  }
}

export function formatStrikeText(text: string, start: number, end: number): {
  newText: string;
  newStart: number;
  newEnd: number;
} {
  const selectedText = text.substring(start, end);
  const wrapper = '~~';
  
  if (selectedText.startsWith(wrapper) && selectedText.endsWith(wrapper)) {
    // Remove strikethrough formatting
    const unwrapped = selectedText.substring(wrapper.length, selectedText.length - wrapper.length);
    const newText = text.substring(0, start) + unwrapped + text.substring(end);
    return {
      newText,
      newStart: start,
      newEnd: start + unwrapped.length,
    };
  } else {
    // Add strikethrough formatting
    const wrapped = wrapper + selectedText + wrapper;
    const newText = text.substring(0, start) + wrapped + text.substring(end);
    return {
      newText,
      newStart: start + wrapper.length,
      newEnd: end + wrapper.length,
    };
  }
}

export function formatHeading(text: string, position: number, level: 1 | 2): {
  newText: string;
  newPosition: number;
} {
  const lineStart = text.lastIndexOf('\n', position - 1) + 1;
  const lineEnd = text.indexOf('\n', position);
  const actualLineEnd = lineEnd === -1 ? text.length : lineEnd;
  const currentLine = text.substring(lineStart, actualLineEnd);
  
  const prefix = '#'.repeat(level) + ' ';
  const otherPrefix = level === 1 ? '## ' : '# ';
  
  let newLine: string;
  let positionOffset = 0;
  
  if (currentLine.startsWith(prefix)) {
    // Remove current heading
    newLine = currentLine.substring(prefix.length);
    positionOffset = -prefix.length;
  } else if (currentLine.startsWith(otherPrefix)) {
    // Change to different heading level
    newLine = prefix + currentLine.substring(otherPrefix.length);
    positionOffset = prefix.length - otherPrefix.length;
  } else {
    // Add heading
    newLine = prefix + currentLine;
    positionOffset = prefix.length;
  }
  
  const newText = text.substring(0, lineStart) + newLine + text.substring(actualLineEnd);
  const newPosition = Math.max(lineStart + prefix.length, position + positionOffset);
  
  return { newText, newPosition };
}

export function formatList(text: string, position: number, ordered: boolean = false): {
  newText: string;
  newPosition: number;
} {
  const lineStart = text.lastIndexOf('\n', position - 1) + 1;
  const lineEnd = text.indexOf('\n', position);
  const actualLineEnd = lineEnd === -1 ? text.length : lineEnd;
  const currentLine = text.substring(lineStart, actualLineEnd);
  
  const bulletPattern = /^(\s*)([-*+])\s/;
  const orderedPattern = /^(\s*)(\d+)\.\s/;
  
  const bulletMatch = currentLine.match(bulletPattern);
  const orderedMatch = currentLine.match(orderedPattern);
  
  let newLine: string;
  let positionOffset = 0;
  
  if (ordered) {
    if (orderedMatch) {
      // Remove ordered list
      newLine = orderedMatch[1] + currentLine.substring(orderedMatch[0].length);
      positionOffset = -orderedMatch[0].length + orderedMatch[1].length;
    } else if (bulletMatch) {
      // Convert bullet to ordered
      const prefix = bulletMatch[1] + '1. ';
      newLine = prefix + currentLine.substring(bulletMatch[0].length);
      positionOffset = prefix.length - bulletMatch[0].length;
    } else {
      // Add ordered list
      const prefix = '1. ';
      newLine = prefix + currentLine;
      positionOffset = prefix.length;
    }
  } else {
    if (bulletMatch) {
      // Remove bullet list
      newLine = bulletMatch[1] + currentLine.substring(bulletMatch[0].length);
      positionOffset = -bulletMatch[0].length + bulletMatch[1].length;
    } else if (orderedMatch) {
      // Convert ordered to bullet
      const prefix = orderedMatch[1] + '- ';
      newLine = prefix + currentLine.substring(orderedMatch[0].length);
      positionOffset = prefix.length - orderedMatch[0].length;
    } else {
      // Add bullet list
      const prefix = '- ';
      newLine = prefix + currentLine;
      positionOffset = prefix.length;
    }
  }
  
  const newText = text.substring(0, lineStart) + newLine + text.substring(actualLineEnd);
  const newPosition = position + positionOffset;
  
  return { newText, newPosition };
}

export function formatBlockquote(text: string, position: number): {
  newText: string;
  newPosition: number;
} {
  const lineStart = text.lastIndexOf('\n', position - 1) + 1;
  const lineEnd = text.indexOf('\n', position);
  const actualLineEnd = lineEnd === -1 ? text.length : lineEnd;
  const currentLine = text.substring(lineStart, actualLineEnd);
  
  const prefix = '> ';
  let newLine: string;
  let positionOffset = 0;
  
  if (currentLine.startsWith(prefix)) {
    // Remove blockquote
    newLine = currentLine.substring(prefix.length);
    positionOffset = -prefix.length;
  } else {
    // Add blockquote
    newLine = prefix + currentLine;
    positionOffset = prefix.length;
  }
  
  const newText = text.substring(0, lineStart) + newLine + text.substring(actualLineEnd);
  const newPosition = position + positionOffset;
  
  return { newText, newPosition };
}

export function insertLink(text: string, start: number, end: number, url: string): {
  newText: string;
  newStart: number;
  newEnd: number;
} {
  const selectedText = text.substring(start, end);
  const linkText = selectedText || 'Link text';
  const linkMarkdown = `[${linkText}](${url})`;
  
  const newText = text.substring(0, start) + linkMarkdown + text.substring(end);
  
  return {
    newText,
    newStart: start + 1, // Position cursor in link text
    newEnd: start + 1 + linkText.length,
  };
}