import { describe, expect, it } from 'vitest';
import { escapeHtml, formatBytes } from '../../src/format';

describe('display helpers', () => {
  it('formats archive sizes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(10 * 1024 ** 3)).toBe('10 GB');
  });

  it('escapes path and label content before rendering', () => {
    expect(escapeHtml('<img src=x onerror="bad">')).toBe('&lt;img src=x onerror=&quot;bad&quot;&gt;');
  });
});
