import type { ArchiveFile, ArchiveVolume, Drill, ExportBundle } from './types';

const DB_NAME = 'archive-restore-rehearsal';
const DB_VERSION = 1;

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Local database request failed.'));
  });
}

let connection: Promise<IDBDatabase> | undefined;

export function openDb(): Promise<IDBDatabase> {
  if (connection) return connection;
  connection = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore('volumes', { keyPath: 'id' });
      const files = db.createObjectStore('files', { keyPath: 'id' });
      files.createIndex('volumeId', 'volumeId');
      files.createIndex('scanId', 'scanId');
      db.createObjectStore('drills', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Could not open local archive database.'));
  });
  return connection;
}

async function store(name: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
  const db = await openDb();
  return db.transaction(name, mode).objectStore(name);
}

export async function getVolumes(): Promise<ArchiveVolume[]> {
  return request((await store('volumes')).getAll());
}

export async function putVolume(volume: ArchiveVolume): Promise<void> {
  await request((await store('volumes', 'readwrite')).put(volume));
}

export async function deleteVolume(id: string): Promise<void> {
  const db = await openDb();
  const transaction = db.transaction(['volumes', 'files'], 'readwrite');
  transaction.objectStore('volumes').delete(id);
  const index = transaction.objectStore('files').index('volumeId');
  await new Promise<void>((resolve, reject) => {
    const cursor = index.openKeyCursor(IDBKeyRange.only(id));
    cursor.onsuccess = () => {
      const item = cursor.result;
      if (!item) return resolve();
      transaction.objectStore('files').delete(item.primaryKey);
      item.continue();
    };
    cursor.onerror = () => reject(cursor.error);
  });
}

export async function putFile(file: ArchiveFile): Promise<void> {
  await request((await store('files', 'readwrite')).put(file));
}

export async function getFiles(volumeId?: string): Promise<ArchiveFile[]> {
  const objectStore = await store('files');
  return volumeId
    ? request(objectStore.index('volumeId').getAll(IDBKeyRange.only(volumeId)))
    : request(objectStore.getAll());
}

export async function removeOldScanFiles(volumeId: string, keepScanId: string): Promise<void> {
  const db = await openDb();
  const transaction = db.transaction('files', 'readwrite');
  const store = transaction.objectStore('files');
  const index = store.index('volumeId');
  await new Promise<void>((resolve, reject) => {
    const cursor = index.openCursor(IDBKeyRange.only(volumeId));
    cursor.onsuccess = () => {
      const item = cursor.result;
      if (!item) return resolve();
      if ((item.value as ArchiveFile).scanId !== keepScanId) item.delete();
      item.continue();
    };
    cursor.onerror = () => reject(cursor.error);
  });
}

export async function getDrills(): Promise<Drill[]> {
  return request((await store('drills')).getAll());
}

export async function putDrill(drill: Drill): Promise<void> {
  await request((await store('drills', 'readwrite')).put(drill));
}

export async function clearAll(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(['volumes', 'files', 'drills'], 'readwrite');
  tx.objectStore('volumes').clear();
  tx.objectStore('files').clear();
  tx.objectStore('drills').clear();
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function exportBundle(): Promise<ExportBundle> {
  const volumes = (await getVolumes()).map(({ handle: _handle, ...volume }) => volume);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    volumes,
    files: await getFiles(),
    drills: await getDrills()
  };
}

export async function importBundle(bundle: ExportBundle): Promise<void> {
  if (bundle.version !== 1 || !Array.isArray(bundle.volumes) || !Array.isArray(bundle.files) || !Array.isArray(bundle.drills)) {
    throw new Error('This is not a valid Archive Restore Rehearsal export.');
  }
  await clearAll();
  for (const volume of bundle.volumes) await putVolume(volume);
  for (const file of bundle.files) await putFile(file);
  for (const drill of bundle.drills) await putDrill(drill);
}
