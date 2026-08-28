import { describe, expect, it } from 'vitest';
import { drillSummary, proposeSamples } from '../../src/sample';
import type { ArchiveFile, Drill } from '../../src/types';

const files: ArchiveFile[] = [
  { id: 'v:a', volumeId: 'v', scanId: 's', path: 'a.jpg', name: 'a.jpg', size: 100, type: 'image/jpeg', lastModified: 1, sha256: 'a' },
  { id: 'v:b', volumeId: 'v', scanId: 's', path: 'b.zip', name: 'b.zip', size: 1_000_000, type: 'application/zip', lastModified: 1, sha256: 'b' },
  { id: 'x:c', volumeId: 'x', scanId: 's', path: 'c.txt', name: 'c.txt', size: 500, type: 'text/plain', lastModified: 1, sha256: 'c' }
];

describe('restore sample rotation', () => {
  it('returns unique catalogue files capped by the requested size', () => {
    const samples = proposeSamples(files, [], 2, () => 0.5);
    expect(samples).toHaveLength(2);
    expect(new Set(samples.map((sample) => sample.fileId)).size).toBe(2);
    expect(samples.every((sample) => sample.result === 'pending')).toBe(true);
  });

  it('prefers a file never rehearsed over a recently checked peer', () => {
    const recent: Drill = {
      id: 'd', createdAt: new Date().toISOString(), completedAt: new Date().toISOString(),
      samples: [{ fileId: 'v:b', volumeId: 'v', path: 'b.zip', name: 'b.zip', size: 1_000_000, sha256: 'b', result: 'pass' }]
    };
    const samples = proposeSamples(files.slice(1), [recent], 1, () => 0);
    expect(samples[0].fileId).toBe('x:c');
  });

  it('summarizes passed, pending, and attention results', () => {
    const drill: Drill = {
      id: 'd', createdAt: '', samples: [
        { fileId: '1', volumeId: 'v', path: '', name: '', size: 1, sha256: '', result: 'pass' },
        { fileId: '2', volumeId: 'v', path: '', name: '', size: 1, sha256: '', result: 'missing' },
        { fileId: '3', volumeId: 'v', path: '', name: '', size: 1, sha256: '', result: 'pending' }
      ]
    };
    expect(drillSummary(drill)).toEqual({ passed: 1, attention: 1, pending: 1 });
  });
});
