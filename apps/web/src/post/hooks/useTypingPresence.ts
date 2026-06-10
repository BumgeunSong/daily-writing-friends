import { useCallback, useEffect, useRef, useState } from 'react';

interface UseTypingPresenceOptions {
  idleDelay: number;
}

interface UseTypingPresenceReturn {
  isTyping: boolean;
  ping: () => void;
}

/**
 * Tracks whether the user is actively typing by treating each `ping()` as a
 * keepalive. Goes idle once `idleDelay` milliseconds pass without a ping.
 *
 * Why: editor onChange callbacks are usually debounced for performance, which
 * means continuous typing can starve a presence timer that listens only to the
 * debounced signal. Callers should `ping()` from a non-debounced source (e.g.
 * Tiptap's onUpdate) so presence stays accurate while typing is continuous.
 */
export function useTypingPresence({
  idleDelay,
}: UseTypingPresenceOptions): UseTypingPresenceReturn {
  const [isTyping, setIsTyping] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const ping = useCallback(() => {
    setIsTyping(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, idleDelay);
  }, [idleDelay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { isTyping, ping };
}
