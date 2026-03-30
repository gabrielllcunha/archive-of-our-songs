import { IDB_NAME, IDB_SCHEMA_VERSION, STORE_YEARLY_DATA } from './schema';

export function openArchiveDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'));
      return;
    }
    const request = indexedDB.open(IDB_NAME, IDB_SCHEMA_VERSION);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_YEARLY_DATA)) {
        db.createObjectStore(STORE_YEARLY_DATA);
      }
    };
  });
}
