import { useEffect } from 'react';

import { MentionableInput } from '@/comment/components/MentionableInput';
import { REPLY_PLACEHOLDER } from '@/comment/model/Reply';

import { SettledGate } from './SettledGate';
import type { Fixture } from './fixtures';

const NOOP = async () => {};

// The width box stands in for the post-detail comment column.
const GATE_ROOT_STYLE = { maxWidth: 640, margin: '0 auto', padding: 16 } as const;

/**
 * Fixture path: mount the fixture's real screen and let SettledGate own the
 * data-vg-ready signal (it waits for async data). Legacy ?component= path:
 * mount one stateless input and signal on fonts+rAF (settles synchronously).
 */
export function Harness({ fixture }: { fixture: Fixture | null }) {
  if (fixture) {
    return (
      <div data-gate-root style={GATE_ROOT_STYLE}>
        <SettledGate>{fixture.render()}</SettledGate>
      </div>
    );
  }
  return <LegacyHarness />;
}

function LegacyHarness() {
  const which = new URLSearchParams(location.search).get('component') ?? 'commentInput';

  useEffect(() => {
    let raf = 0;
    Promise.resolve(document.fonts?.ready).then(() => {
      raf = requestAnimationFrame(() => document.documentElement.setAttribute('data-vg-ready', ''));
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div data-gate-root style={GATE_ROOT_STYLE}>
      {which === 'replyInput' ? (
        <MentionableInput boardId='gate-board' onSubmit={NOOP} placeholder={REPLY_PLACEHOLDER} />
      ) : (
        <MentionableInput boardId='gate-board' onSubmit={NOOP} />
      )}
    </div>
  );
}
