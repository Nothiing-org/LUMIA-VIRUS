
import { Project, DayRecord } from '../types';
import { obfuscateData, deobfuscateData } from '../utils/security';

const DB_NAME = 'PixelRevealDB';
const DB_VERSION = 2;
const STORE_PROJECTS = 'projects';
const STORE_RECORDS = 'records';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_RECORDS)) {
        const recordStore = db.createObjectStore(STORE_RECORDS, { keyPath: 'id' });
        recordStore.createIndex('projectId', 'projectId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const storage = {
  async getProjects(): Promise<Project[]> {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_PROJECTS, 'readonly');
      const store = tx.objectStore(STORE_PROJECTS);
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result.map((p: Project) => {
          if (p.isPro) {
            try {
              p.name = deobfuscateData(p.name);
            } catch (e) {
              console.error("Deobfuscation failed for project", p.id);
            }
          }
          return p;
        });
        resolve(results);
      };
    });
  },

  async saveProject(project: Project): Promise<void> {
    const db = await openDB();

    // Security enhancement: Obfuscate sensitive data for Pro projects
    const projectToSave = { ...project };
    if (projectToSave.isPro) {
      projectToSave.name = obfuscateData(projectToSave.name);
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readwrite');
      const store = tx.objectStore(STORE_PROJECTS);
      const request = store.put(projectToSave);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async deleteProject(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_PROJECTS, STORE_RECORDS], 'readwrite');
      
      // Delete Project
      tx.objectStore(STORE_PROJECTS).delete(id);
      
      // Delete associated records
      const recordStore = tx.objectStore(STORE_RECORDS);
      const index = recordStore.index('projectId');
      const request = index.getAllKeys(id);
      
      request.onsuccess = () => {
        request.result.forEach(key => recordStore.delete(key));
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getRecords(projectId: string): Promise<DayRecord[]> {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_RECORDS, 'readonly');
      const store = tx.objectStore(STORE_RECORDS);
      const index = store.index('projectId');
      const request = index.getAll(projectId);
      request.onsuccess = () => {
        const results = request.result as DayRecord[];
        resolve(results.sort((a, b) => a.dayNumber - b.dayNumber));
      };
    });
  },

  async saveRecord(record: DayRecord): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_RECORDS, 'readwrite');
      const store = tx.objectStore(STORE_RECORDS);
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async deleteRecord(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_RECORDS, 'readwrite');
      const store = tx.objectStore(STORE_RECORDS);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};
