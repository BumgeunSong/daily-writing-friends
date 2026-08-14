import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useScrollToDeepLinkTarget } from './useScrollToDeepLinkTarget';

function Host() {
  useScrollToDeepLinkTarget();
  return <div id="comment-c-1">target comment</div>;
}

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Host />
    </MemoryRouter>,
  );
}

describe('useScrollToDeepLinkTarget', () => {
  let scrollIntoView: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    scrollIntoView = vi.fn();
    // jsdom does not implement scrollIntoView; install a stub to observe calls.
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('scrolls the ?commentId target into view once it has rendered', () => {
    renderAt('/board/b/post/p?commentId=c-1');

    vi.advanceTimersByTime(50);

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
  });

  it('does nothing when the URL has no deep-link target', () => {
    renderAt('/board/b/post/p');

    vi.advanceTimersByTime(50);

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('does not scroll when the target element is absent (degrades to top)', () => {
    renderAt('/board/b/post/p?replyId=missing');

    vi.advanceTimersByTime(200);

    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
