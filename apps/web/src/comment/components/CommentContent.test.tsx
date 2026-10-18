import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { CommentContent } from './CommentContent';
import type { ProseMirrorDoc } from '@/shared/model/ProseMirror';
import type { ReactElement } from 'react';

const emptyDoc: ProseMirrorDoc = { type: 'doc', content: [] };

const mentionHtml =
  '<p>hi <span class="rounded bg-primary/10 px-1 text-primary" data-mention="" data-user-id="user-1">@alice</span></p>';

function renderContent(ui: ReactElement) {
  return render(
    <MemoryRouter initialEntries={['/board']}>
      <Routes>
        <Route path='/board' element={ui} />
        <Route path='/user/:userId' element={<div>profile page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CommentContent', () => {
  it('renders a mention as a profile link when contentJson is present', () => {
    renderContent(<CommentContent content={mentionHtml} contentJson={emptyDoc} />);

    const link = screen.getByText('@alice');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/user/user-1');
  });

  it('navigates to the profile in-app when a mention is clicked', async () => {
    const user = userEvent.setup();
    renderContent(<CommentContent content={mentionHtml} contentJson={emptyDoc} />);

    await user.click(screen.getByText('@alice'));

    expect(screen.getByText('profile page')).toBeInTheDocument();
  });

  it('renders legacy content without a mention link when contentJson is absent', () => {
    renderContent(<CommentContent content='just plain text' />);

    expect(screen.getByText('just plain text')).toBeInTheDocument();
    expect(document.querySelector('a[data-user-id]')).toBeNull();
  });
});
