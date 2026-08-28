import type { ArchiveFile, ArchiveVolume, Drill, ExportBundle } from './types';

const DB_NAME = 'archive-restore-rehearsal';
const DB_VERSION = 1;
let namespace = '';

/** Select the isolated database before the first read. Demo data never shares
 * a database with a visitor's archive map. */
export function setDatabaseNamespace(value = ''): void {
  if (connection) throw new Error('The archive database is already open.');
  namespace = value;
}

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
    const req = indexedDB.open(namespace ? `${namespace}:${DB_NAME}` : DB_NAME, DB_VERSION);
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
  validateBundle(bundle);
  const db = await openDb();
  const tx = db.transaction(['volumes', 'files', 'drills'], 'readwrite');
  const volumes = tx.objectStore('volumes');
  const files = tx.objectStore('files');
  const drills = tx.objectStore('drills');
  // Every record is validated before any clear request is queued. The single
  // transaction makes replacement all-or-nothing if IndexedDB rejects a put.
  volumes.clear(); files.clear(); drills.clear();
  for (const volume of bundle.volumes) volumes.put(volume);
  for (const file of bundle.files) files.put(file);
  for (const drill of bundle.drills) drills.put(drill);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error('The import could not be saved; your existing map was kept.'));
    tx.onerror = () => { /* onabort supplies the final transaction result */ };
  });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): value is string { return typeof value === 'string'; }
function number(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }

/** Complete schema check. This is deliberately strict because import replaces data. */
export function validateBundle(bundle: unknown): asserts bundle is ExportBundle {
  if (!isObject(bundle) || bundle.version !== 1 || !text(bundle.exportedAt) || !Array.isArray(bundle.volumes) || !Array.isArray(bundle.files) || !Array.isArray(bundle.drills)) {
    throw new Error('This is not a valid Archive Restore Rehearsal export.');
  }
  const ids = new Set<string>();
  for (const volume of bundle.volumes) {
    if (!isObject(volume) || !text(volume.id) || ids.has(volume.id) || !text(volume.label) || !text(volume.location) || !text(volume.notes) || !text(volume.rootName) || !text(volume.addedAt) || !number(volume.fileCount) || !number(volume.totalBytes) || !['ready', 'scanning', 'error'].includes(String(volume.scanState)) || (volume.lastScannedAt !== undefined && !text(volume.lastScannedAt)) || (volume.fingerprint !== undefined && !text(volume.fingerprint)) || (volume.scanError !== undefined && !text(volume.scanError))) throw new Error('This export has an invalid archive location. Nothing was changed.');
    ids.add(volume.id);
  }
  const fileIds = new Set<string>();
  for (const file of bundle.files) {
    if (!isObject(file) || !text(file.id) || fileIds.has(file.id) || !text(file.volumeId) || !ids.has(file.volumeId) || !text(file.scanId) || !text(file.path) || !text(file.name) || !number(file.size) || !text(file.type) || !number(file.lastModified) || !/^[a-f0-9]{64}$/i.test(String(file.sha256))) throw new Error('This export has an invalid file record. Nothing was changed.');
    fileIds.add(file.id);
  }
  const drillIds = new Set<string>();
  for (const drill of bundle.drills) {
    if (!isObject(drill) || !text(drill.id) || drillIds.has(drill.id) || !text(drill.createdAt) || (drill.completedAt !== undefined && !text(drill.completedAt)) || !Array.isArray(drill.samples)) throw new Error('This export has an invalid rehearsal. Nothing was changed.');
    drillIds.add(drill.id);
    for (const sample of drill.samples) {
      if (!isObject(sample) || !text(sample.fileId) || !text(sample.volumeId) || !ids.has(sample.volumeId) || !text(sample.path) || !text(sample.name) || !number(sample.size) || !/^[a-f0-9]{64}$/i.test(String(sample.sha256)) || !['pending', 'pass', 'fail', 'missing', 'skipped'].includes(String(sample.result)) || (sample.note !== undefined && !text(sample.note)) || (sample.checkedAt !== undefined && !text(sample.checkedAt))) throw new Error('This export has an invalid rehearsal sample. Nothing was changed.');
    }
  }
}
