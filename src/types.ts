export type ScanState = 'ready' | 'scanning' | 'error';

export interface ArchiveVolume {
  id: string;
  label: string;
  location: string;
  notes: string;
  rootName: string;
  addedAt: string;
  lastScannedAt?: string;
  fileCount: number;
  totalBytes: number;
  fingerprint?: string;
  scanState: ScanState;
  scanError?: string;
  handle?: FileSystemDirectoryHandle;
}

export interface ArchiveFile {
  id: string;
  volumeId: string;
  scanId: string;
  path: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  sha256: string;
}

export type SampleResult = 'pending' | 'pass' | 'fail' | 'missing' | 'skipped';

export interface DrillSample {
  fileId: string;
  volumeId: string;
  path: string;
  name: string;
  size: number;
  sha256: string;
  result: SampleResult;
  note?: string;
  checkedAt?: string;
}

export interface Drill {
  id: string;
  createdAt: string;
  completedAt?: string;
  samples: DrillSample[];
}

export interface ExportBundle {
  version: 1;
  exportedAt: string;
  volumes: Omit<ArchiveVolume, 'handle'>[];
  files: ArchiveFile[];
  drills: Drill[];
}

export interface LicenseState {
  unlocked: boolean;
  checking: boolean;
  notice?: string;
}

declare global {
  const __BUILD_ID__: string;
  interface Window {
    showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
  }

  interface FileSystemHandle {
    queryPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>;
    requestPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>;
  }

  interface FileSystemDirectoryHandle {
    values(): AsyncIterableIterator<FileSystemHandle>;
    getDirectoryHandle(name: string): Promise<FileSystemDirectoryHandle>;
    getFileHandle(name: string): Promise<FileSystemFileHandle>;
  }
}
