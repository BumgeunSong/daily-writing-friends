import type { KeyboardShortcut } from '../types/nativeEditor';

export function createKeyboardShortcuts(
  actions: {
    toggleBold: () => void;
    toggleItalic: () => void;
    toggleStrike: () => void;
    save: () => void;
    undo?: () => void;
    redo?: () => void;
  }
): KeyboardShortcut[] {
  const isMac = typeof navigator !== 'undefined' && 
               navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return [
    {
      key: 'b',
      [isMac ? 'metaKey' : 'ctrlKey']: true,
      action: actions.toggleBold,
    },
    {
      key: 'i',
      [isMac ? 'metaKey' : 'ctrlKey']: true,
      action: actions.toggleItalic,
    },
    {
      key: 'u',
      [isMac ? 'metaKey' : 'ctrlKey']: true,
      action: actions.toggleStrike, // Using U for strikethrough since S is save
    },
    {
      key: 's',
      [isMac ? 'metaKey' : 'ctrlKey']: true,
      action: actions.save,
    },
    // Undo/Redo are handled by browser for textarea, but we can add custom if needed
    ...(actions.undo ? [{
      key: 'z',
      [isMac ? 'metaKey' : 'ctrlKey']: true,
      action: actions.undo,
    }] : []),
    ...(actions.redo ? [{
      key: 'z',
      [isMac ? 'metaKey' : 'ctrlKey']: true,
      shiftKey: true,
      action: actions.redo,
    }] : []),
  ];
}

export function matchesShortcut(
  event: KeyboardEvent,
  shortcut: KeyboardShortcut
): boolean {
  return (
    event.key.toLowerCase() === shortcut.key.toLowerCase() &&
    !!event.ctrlKey === !!shortcut.ctrlKey &&
    !!event.metaKey === !!shortcut.metaKey &&
    !!event.shiftKey === !!shortcut.shiftKey &&
    !!event.altKey === !!shortcut.altKey
  );
}

export function handleKeyboardShortcut(
  event: KeyboardEvent,
  shortcuts: KeyboardShortcut[]
): boolean {
  for (const shortcut of shortcuts) {
    if (matchesShortcut(event, shortcut)) {
      event.preventDefault();
      shortcut.action();
      return true;
    }
  }
  return false;
}

export function getShortcutDisplayText(shortcut: KeyboardShortcut): string {
  const isMac = typeof navigator !== 'undefined' && 
               navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  let parts: string[] = [];
  
  if (shortcut.ctrlKey && !isMac) parts.push('Ctrl');
  if (shortcut.metaKey || (shortcut.ctrlKey && isMac)) parts.push(isMac ? '⌘' : 'Cmd');
  if (shortcut.altKey) parts.push(isMac ? '⌥' : 'Alt');
  if (shortcut.shiftKey) parts.push(isMac ? '⇧' : 'Shift');
  
  parts.push(shortcut.key.toUpperCase());
  
  return parts.join(isMac ? '' : '+');
}