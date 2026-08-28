import { getVolumes, importBundle } from './db';
import type { ExportBundle } from './types';

const SHA = '8d2f3b0d154cc9e9c7f7380f52356dd3c72ab46ca6f3b307da47f2e7e27962c2';

export async function seedDemo(): Promise<void> {
  if ((await getVolumes()).length) return;
  const now = '2026-08-28T10:00:00.000Z';
  const volumeId = 'demo-blue-family-drive';
  const bundle: ExportBundle = {
    version: 1, exportedAt: now,
    volumes: [{ id: volumeId, label: 'Blue family drive', location: 'Hall cupboard · red case', notes: 'USB-C cable in the envelope.', rootName: 'Family_Archive', addedAt: now, lastScannedAt: now, fileCount: 3, totalBytes: 2693120, fingerprint: SHA, scanState: 'ready' }],
    files: [
      { id: `${volumeId}:photos/2011-picnic.jpg`, volumeId, scanId: 'demo-scan', path: 'photos/2011-picnic.jpg', name: '2011-picnic.jpg', size: 1820300, type: 'image/jpeg', lastModified: 1300000000000, sha256: SHA },
      { id: `${volumeId}:notes/family-history.txt`, volumeId, scanId: 'demo-scan', path: 'notes/family-history.txt', name: 'family-history.txt', size: 12820, type: 'text/plain', lastModified: 1300000000000, sha256: SHA },
      { id: `${volumeId}:video/garden-clip.mp4`, volumeId, scanId: 'demo-scan', path: 'video/garden-clip.mp4', name: 'garden-clip.mp4', size: 860000, type: 'video/mp4', lastModified: 1300000000000, sha256: SHA }
    ], drills: []
  };
  await importBundle(bundle);
}
