import { openArchiveDb } from './openArchiveDb';
import { STORE_SECRET_PAGES, STORE_YEARLY_DATA } from './schema';

async function clearStoreKeysWithPrefix(storeName: string, prefix: string): Promise<void> {
  const db = await openArchiveDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.openCursor();

    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      const key = cursor.key;
      if (typeof key === 'string' && key.startsWith(prefix)) {
        cursor.delete();
      }
      cursor.continue();
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB clear failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB clear aborted'));
  });
}

export async function clearUserLocalData(lastfmUsername: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const prefix = `${lastfmUsername}::`;
  await clearStoreKeysWithPrefix(STORE_YEARLY_DATA, prefix);
  await clearStoreKeysWithPrefix(STORE_SECRET_PAGES, prefix);
}
