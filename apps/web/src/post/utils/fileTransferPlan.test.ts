import { describe, it, expect } from 'vitest';

import { planFileTransfer, type TransferItem } from './fileTransferPlan';

const fileItem = (name: string): TransferItem => ({
  kind: 'file',
  file: new File(['x'], name, { type: 'image/png' }),
});
const stringItem = (): TransferItem => ({ kind: 'string', file: null });
const unreadableFileItem = (): TransferItem => ({ kind: 'file', file: null });

describe('planFileTransfer', () => {
  describe('when there are no items', () => {
    it('does not claim the event and has no files', () => {
      expect(planFileTransfer([])).toEqual({ files: [], shouldClaimEvent: false });
    });
  });

  describe('when items are only text (e.g. plain text paste)', () => {
    it('does not claim the event, so the editor handles the paste itself', () => {
      expect(planFileTransfer([stringItem()])).toEqual({ files: [], shouldClaimEvent: false });
    });
  });

  describe('when a single file is transferred', () => {
    it('claims the event and returns that file', () => {
      const item = fileItem('a.png');
      const plan = planFileTransfer([item]);
      expect(plan.shouldClaimEvent).toBe(true);
      expect(plan.files).toEqual([item.file]);
    });
  });

  describe('when multiple files are transferred', () => {
    it('returns every file in the original order (no silent drop)', () => {
      const [a, b, c] = [fileItem('a.png'), fileItem('b.png'), fileItem('c.png')];
      const plan = planFileTransfer([a, b, c]);
      expect(plan.files.map((f) => f.name)).toEqual(['a.png', 'b.png', 'c.png']);
    });
  });

  describe('when files are mixed with non-file items', () => {
    it('keeps only the files and still claims the event', () => {
      const plan = planFileTransfer([stringItem(), fileItem('a.png'), stringItem()]);
      expect(plan.files.map((f) => f.name)).toEqual(['a.png']);
      expect(plan.shouldClaimEvent).toBe(true);
    });
  });

  describe('when a file item cannot be read (getAsFile returned null)', () => {
    it('skips it and does not claim the event if nothing else is usable', () => {
      expect(planFileTransfer([unreadableFileItem()])).toEqual({
        files: [],
        shouldClaimEvent: false,
      });
    });

    it('still processes the other readable files', () => {
      const plan = planFileTransfer([unreadableFileItem(), fileItem('a.png')]);
      expect(plan.files.map((f) => f.name)).toEqual(['a.png']);
    });
  });

  describe('when a non-file item somehow carries a File', () => {
    it('trusts `kind` and ignores it', () => {
      const odd: TransferItem = { kind: 'string', file: new File(['x'], 'odd.png') };
      expect(planFileTransfer([odd])).toEqual({ files: [], shouldClaimEvent: false });
    });
  });
});
