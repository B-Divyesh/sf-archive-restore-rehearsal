import { hashFile } from './hash';
import { putFile, putVolume, removeOldScanFiles } from './db';
import type { ArchiveFile, ArchiveVolume } from './types';

export interface ScanProgress {
  count: number;
  bytes: number;
  currentPath: string;
}

async function* walk(directory: FileSystemDirectoryHandle, prefix = ''): AsyncGenerator<{ file: File; path: string }> {
  for await (const handle of directory.values()) {
    const path = prefix ? `${prefix}/${handle.name}` : handle.name;
    if (handle.kind === 'directory') {
      yield* walk(handle as FileSystemDirectoryHandle, path);
    } else {
      yield { file: await (handle as FileSystemFileHandle).getFile(), path };
    }
  }
}

function fileId(volumeId: string, path: string): string {
  return `${volumeId}:${path}`;
}

export async function scanDirectory(
  volume: ArchiveVolume,
  handle: FileSystemDirectoryHandle,
  onProgress: (progress: ScanProgress) => void
): Promise<ArchiveVolume> {
  const scanId = crypto.randomUUID();
  let count = 0;
  let bytes = 0;
  let fingerprintSeed = '';
  const scanning = { ...volume, handle, rootName: handle.name, scanState: 'scanning' as const, scanError: undefined };
  await putVolume(scanning);

  try {
    for await (const item of walk(handle)) {
      const sha = await hashFile(item.file);
      const record: ArchiveFile = {
        id: fileId(volume.id, item.path),
        volumeId: volume.id,
        scanId,
        path: item.path,
        name: item.file.name,
        size: item.file.size,
        type: item.file.type,
        lastModified: item.file.lastModified,
        sha256: sha
      };
      await putFile(record);
      count += 1;
      bytes += item.file.size;
      if (count <= 12) fingerprintSeed += `${item.path}\0${item.file.size}\0${sha}`;
      onProgress({ count, bytes, currentPath: item.path });
    }
    const fingerprintData = new TextEncoder().encode(fingerprintSeed || `${handle.name}:empty`);
    const fingerprint = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', fingerprintData)))
      .map((byte) => byte.toString(16).padStart(2, '0')).join('');
    await removeOldScanFiles(volume.id, scanId);
    const finished: ArchiveVolume = {
      ...scanning,
      fileCount: count,
      totalBytes: bytes,
      fingerprint,
      lastScannedAt: new Date().toISOString(),
      scanState: 'ready'
    };
    await putVolume(finished);
    return finished;
  } catch (error) {
    const failed: ArchiveVolume = {
      ...scanning,
      scanState: 'error',
      scanError: error instanceof Error ? error.message : 'The scan stopped unexpectedly.'
    };
    await putVolume(failed);
    throw error;
  }
}

export async function getFileFromHandle(handle: FileSystemDirectoryHandle, path: string): Promise<File> {
  const parts = path.split('/');
  let directory = handle;
  for (const part of parts.slice(0, -1)) directory = await directory.getDirectoryHandle(part);
  return (await directory.getFileHandle(parts.at(-1)!)).getFile();
}

export function filesFromInput(files: FileList): Array<{ file: File; path: string }> {
  return Array.from(files).map((file) => ({
    file,
    path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name
  }));
}

export async function scanFileList(
  volume: ArchiveVolume,
  files: FileList,
  onProgress: (progress: ScanProgress) => void
): Promise<ArchiveVolume> {
  const scanId = crypto.randomUUID();
  let count = 0;
  let bytes = 0;
  let fingerprintSeed = '';
  const rootName = files.item(0)
    ? ((files.item(0) as File & { webkitRelativePath?: string }).webkitRelativePath?.split('/')[0] || 'Selected files')
    : 'Selected files';
  const scanning = { ...volume, rootName, scanState: 'scanning' as const, scanError: undefined };
  await putVolume(scanning);
  try {
    for (const item of filesFromInput(files)) {
      const sha = await hashFile(item.file);
      await putFile({
        id: fileId(volume.id, item.path), volumeId: volume.id, scanId, path: item.path,
        name: item.file.name, size: item.file.size, type: item.file.type,
        lastModified: item.file.lastModified, sha256: sha
      });
      count += 1;
      bytes += item.file.size;
      if (count <= 12) fingerprintSeed += `${item.path}\0${item.file.size}\0${sha}`;
      onProgress({ count, bytes, currentPath: item.path });
    }
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprintSeed || `${rootName}:empty`));
    const fingerprint = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
    await removeOldScanFiles(volume.id, scanId);
    const finished: ArchiveVolume = {
      ...scanning, fileCount: count, totalBytes: bytes, fingerprint,
      lastScannedAt: new Date().toISOString(), scanState: 'ready'
    };
    await putVolume(finished);
    return finished;
  } catch (error) {
    const failed = { ...scanning, scanState: 'error' as const, scanError: error instanceof Error ? error.message : 'The scan stopped unexpectedly.' };
    await putVolume(failed);
    throw error;
  }
}
