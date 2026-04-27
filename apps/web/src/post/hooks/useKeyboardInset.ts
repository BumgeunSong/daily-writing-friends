import { useEffect, useState } from 'react';

/**
 * Returns how many pixels the on-screen keyboard occupies at the bottom
 * of the layout viewport.
 *
 * Why: position:fixed anchors to the layout viewport, but mobile keyboards
 * shrink the visual viewport without resizing the layout. Use this offset
 * to translate fixed-bottom UI above the keyboard.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const visualViewport = window.visualViewport;
    if (!visualViewport) return;

    const update = () => {
      // Pinch-zoom also shrinks the visual viewport. Only treat shrinkage as keyboard inset.
      if (visualViewport.scale > 1) {
        setInset(0);
        return;
      }
      const bottomInset =
        window.innerHeight - visualViewport.height - visualViewport.offsetTop;
      setInset(Math.max(0, bottomInset));
    };

    update();
    visualViewport.addEventListener('resize', update);
    visualViewport.addEventListener('scroll', update);
    return () => {
      visualViewport.removeEventListener('resize', update);
      visualViewport.removeEventListener('scroll', update);
    };
  }, []);

  return inset;
}
