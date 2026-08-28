import { describe, expect, it } from 'vitest';
import { validateBundle } from '../../src/db';

describe('import validation', () => {
  it('rejects a top-level-valid bundle with a null volume before any replacement @regression:atomic-import', () => {
    expect(() => validateBundle({ version: 1, exportedAt: '2026-08-28T00:00:00.000Z', volumes: [null], files: [], drills: [] })).toThrow(/invalid archive location/i);
  });
});
