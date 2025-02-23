export class IndexedDB {
  private dbName: string;
  private dbVersion: number;

  constructor(dbName: string, dbVersion: number) {
    this.dbName = dbName;
    this.dbVersion = dbVersion;
  }

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
  
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('albums')) {
          db.createObjectStore('albums');
        }
        if (!db.objectStoreNames.contains('artists')) {
          db.createObjectStore('artists');
        }
        if (!db.objectStoreNames.contains('songs')) {
          db.createObjectStore('songs');
        }
      };
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async storeData(storeName: string, year: number, data: any): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data, year);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getData(storeName: string, year: number): Promise<any> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db?.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(year);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const db = new IndexedDB('LastFmData', 1);
