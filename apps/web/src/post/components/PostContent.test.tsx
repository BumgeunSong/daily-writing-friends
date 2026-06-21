import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PostContent } from './PostContent';
import { PostVisibility, type Post } from '@/post/model/Post';
import { createTimestamp } from '@/shared/model/Timestamp';

const IMG_SRC = 'https://example.com/test.jpg';

const buildPost = (content: string): Post => ({
  id: 'p1',
  boardId: 'b1',
  title: 't',
  content,
  thumbnailImageURL: null,
  authorId: 'a1',
  authorName: 'A',
  createdAt: createTimestamp(new Date(0)),
  countOfComments: 0,
  countOfReplies: 0,
  countOfLikes: 0,
  visibility: PostVisibility.PUBLIC,
});

// Wait for MutationObserver callbacks to flush (they run after the current
// microtask checkpoint).
const flushMutationObserver = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

// Wipes the element's children and rebuilds them by parsing `html` — emulates
// what React does when it re-stamps a dangerouslySet HTML payload on re-render.
// Callers MUST pass the pristine HTML captured before any reveal markers were
// added, otherwise the round-trip just preserves the previous marker.
const replaceChildrenWithFreshHtml = (el: HTMLElement, html: string) => {
  while (el.firstChild) el.removeChild(el.firstChild);
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  Array.from(parsed.body.childNodes).forEach((node) => el.appendChild(node));
};

describe('PostContent — body image reveal', () => {
  it('marks the body image as loaded after its load event fires', () => {
    const post = buildPost(`<p>before</p><p><img src="${IMG_SRC}" alt="test"></p>`);
    const { container } = render(<PostContent post={post} isAuthor={false} />);

    const img = container.querySelector('.dwf-post-body img') as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.dataset.loaded).toBeUndefined();

    fireEvent.load(img);

    expect(img.dataset.loaded).toBe('true');
  });

  // Regression: previously the reveal effect only attached listeners on the
  // initial img nodes. If the parent re-rendered and React re-stamped the body
  // HTML (replacing img elements with fresh nodes), the new imgs had no
  // data-loaded marker — CSS animated opacity from 1 back to 0 and the body
  // image silently disappeared a second after the page mounted.
  it('re-marks images that replace the original nodes (parent re-render path)', async () => {
    const post = buildPost(`<p>before</p><p><img src="${IMG_SRC}" alt="test"></p>`);
    const { container } = render(<PostContent post={post} isAuthor={false} />);

    const body = container.querySelector('.dwf-post-body') as HTMLElement;
    // Capture the body markup BEFORE any reveal marker is added, so the
    // simulated re-stamp produces pristine img nodes.
    const pristineHtml = body.innerHTML;

    const firstImg = body.querySelector('img') as HTMLImageElement;
    fireEvent.load(firstImg);
    expect(firstImg.dataset.loaded).toBe('true');

    replaceChildrenWithFreshHtml(body, pristineHtml);

    await flushMutationObserver();

    const secondImg = body.querySelector('img') as HTMLImageElement;
    expect(secondImg).not.toBe(firstImg);

    // Drive the listener path. Without the MutationObserver, the replaced img
    // has no load handler attached and this fires into the void — leaving the
    // marker absent and the assertion below failing.
    fireEvent.load(secondImg);

    expect(secondImg.dataset.loaded).toBe('true');
  });
});
