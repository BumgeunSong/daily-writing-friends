import { useEffect, useRef, useState } from 'react';
import { Editor } from '@tiptap/react';
import { imeLogger } from '../utils/imeLogger';

interface UseIMEDiagnosticsProps {
  editor: Editor | null;
  enabled?: boolean;
}

interface IMEState {
  isComposing: boolean;
  compositionText: string;
  lastCompositionEnd: string;
  eventCount: number;
}

export function useIMEDiagnostics({ editor, enabled = true }: UseIMEDiagnosticsProps) {
  const [imeState, setIMEState] = useState<IMEState>({
    isComposing: false,
    compositionText: '',
    lastCompositionEnd: '',
    eventCount: 0,
  });
  
  const editorRef = useRef<HTMLElement | null>(null);
  const compositionStartPos = useRef<number>(0);
  const beforeCompositionText = useRef<string>('');

  useEffect(() => {
    if (!editor || !enabled) return;

    const editorElement = editor.view.dom as HTMLElement;
    editorRef.current = editorElement;

    const getEditorState = () => {
      const state = editor.state;
      const { from, to } = state.selection;
      const content = state.doc.textContent;
      return {
        selection: { from, to },
        content: content.substring(Math.max(0, from - 50), Math.min(content.length, to + 50)),
      };
    };

    const handleCompositionStart = (event: CompositionEvent) => {
      const state = getEditorState();
      compositionStartPos.current = state.selection.from;
      beforeCompositionText.current = editor.state.doc.textContent;
      
      imeLogger.logCompositionStart(event, state);
      
      setIMEState(prev => ({
        ...prev,
        isComposing: true,
        compositionText: event.data,
        eventCount: prev.eventCount + 1,
      }));
    };

    const handleCompositionUpdate = (event: CompositionEvent) => {
      const state = getEditorState();
      imeLogger.logCompositionUpdate(event, state);
      
      setIMEState(prev => ({
        ...prev,
        compositionText: event.data,
        eventCount: prev.eventCount + 1,
      }));
    };

    const handleCompositionEnd = (event: CompositionEvent) => {
      const state = getEditorState();
      
      // Check what actually got inserted in the editor
      setTimeout(() => {
        const afterCompositionText = editor.state.doc.textContent;
        const insertedText = afterCompositionText.substring(
          compositionStartPos.current,
          compositionStartPos.current + (afterCompositionText.length - beforeCompositionText.current.length)
        );
        
        imeLogger.logCompositionEnd(event, state, insertedText);
        
        setIMEState(prev => ({
          ...prev,
          isComposing: false,
          lastCompositionEnd: event.data,
          eventCount: prev.eventCount + 1,
        }));
      }, 0);
    };

    const handleBeforeInput = (event: InputEvent) => {
      if (!event.isComposing && !imeState.isComposing) return;
      const state = getEditorState();
      imeLogger.logBeforeInput(event, state);
    };

    const handleInput = (event: Event) => {
      if (!imeState.isComposing) return;
      const state = getEditorState();
      imeLogger.logInput(event, state);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || imeState.isComposing) {
        imeLogger.logKeyEvent(event, 'down');
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.isComposing || imeState.isComposing) {
        imeLogger.logKeyEvent(event, 'up');
      }
    };

    // Add event listeners
    editorElement.addEventListener('compositionstart', handleCompositionStart);
    editorElement.addEventListener('compositionupdate', handleCompositionUpdate);
    editorElement.addEventListener('compositionend', handleCompositionEnd);
    editorElement.addEventListener('beforeinput', handleBeforeInput as EventListener);
    editorElement.addEventListener('input', handleInput);
    editorElement.addEventListener('keydown', handleKeyDown);
    editorElement.addEventListener('keyup', handleKeyUp);

    // Log initial setup
    console.log(
      '%c🚀 IME Diagnostics Initialized',
      'color: #10B981; font-weight: bold',
      '\n  Editor:', editor.options.element,
      '\n  Browser:', navigator.userAgent.substring(0, 50) + '...',
      '\n  Language:', navigator.language,
      '\n  Platform:', navigator.platform,
    );

    // Cleanup
    return () => {
      editorElement.removeEventListener('compositionstart', handleCompositionStart);
      editorElement.removeEventListener('compositionupdate', handleCompositionUpdate);
      editorElement.removeEventListener('compositionend', handleCompositionEnd);
      editorElement.removeEventListener('beforeinput', handleBeforeInput as EventListener);
      editorElement.removeEventListener('input', handleInput);
      editorElement.removeEventListener('keydown', handleKeyDown);
      editorElement.removeEventListener('keyup', handleKeyUp);
    };
  }, [editor, enabled, imeState.isComposing]);

  return {
    imeState,
    imeLogger,
  };
}