
import { Project, DayRecord, UserProfile } from '../types';
import { db, auth } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs, 
  query, 
  where, 
  deleteDoc, 
  orderBy 
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

const STORAGE_KEY = 'llumina_local_v2';

const getCache = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
};

const saveCache = (data: any) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const storage = {
  async getProfile(): Promise<UserProfile | null> {
    const user = auth.currentUser;
    if (!user) return null;
    
    const cache = getCache();
    const local = cache[`profile_${user.uid}`];
    
    // Background sync
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'profiles', user.uid));
        if (snap.exists()) {
          const profile = snap.data() as UserProfile;
          cache[`profile_${user.uid}`] = profile;
          saveCache(cache);
        }
      } catch (e) {}
    })();
    
    return local || null;
  },

  async setProStatus(isPro: boolean): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;
    const profile = { uid: user.uid, isPro, updatedAt: Date.now() };
    const cache = getCache();
    cache[`profile_${user.uid}`] = profile;
    saveCache(cache);
    
    // Fire and forget cloud sync
    setDoc(doc(db, 'profiles', user.uid), profile, { merge: true }).catch(() => {});
  },

  async getProjects(): Promise<Project[]> {
    const user = auth.currentUser;
    if (!user) return [];
    
    const cache = getCache();
    const localProjects = cache[`projects_${user.uid}`] || [];
    
    // Background sync
    (async () => {
      try {
        const q = query(collection(db, 'projects'), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        const remote = snap.docs.map(d => d.data() as Project);
        const currentCache = getCache();
        currentCache[`projects_${user.uid}`] = remote;
        saveCache(currentCache);
      } catch (e) {}
    })();

    return localProjects;
  },

  async saveProject(project: Project): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;
    const projectWithUser = { ...project, userId: user.uid };
    
    // Immediate Local Update
    const cache = getCache();
    const projects = cache[`projects_${user.uid}`] || [];
    const filtered = projects.filter((p: any) => p.id !== project.id);
    cache[`projects_${user.uid}`] = [projectWithUser, ...filtered];
    saveCache(cache);
    
    // Non-blocking cloud sync
    setDoc(doc(db, 'projects', project.id), projectWithUser).catch(() => {
      console.warn("Cloud sync deferred (offline)");
    });
  },

  async deleteProject(id: string): Promise<void> {
    const user = auth.currentUser;
    if (user) {
      const cache = getCache();
      cache[`projects_${user.uid}`] = (cache[`projects_${user.uid}`] || []).filter((p: any) => p.id !== id);
      saveCache(cache);
    }
    // Non-blocking delete
    deleteDoc(doc(db, 'projects', id)).catch(() => {});
  },

  async getRecords(projectId: string): Promise<DayRecord[]> {
    const cache = getCache();
    const local = cache[`records_${projectId}`] || [];
    
    (async () => {
      try {
        const q = query(collection(db, 'records'), where('projectId', '==', projectId), orderBy('dayNumber', 'asc'));
        const snap = await getDocs(q);
        const remote = snap.docs.map(d => d.data() as DayRecord);
        const currentCache = getCache();
        currentCache[`records_${projectId}`] = remote;
        saveCache(currentCache);
      } catch (e) {}
    })();

    return local;
  },

  async saveRecord(record: DayRecord): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;
    const recordWithUser = { ...record, userId: user.uid };
    
    // Immediate Local Update
    const cache = getCache();
    const records = cache[`records_${record.projectId}`] || [];
    const filtered = records.filter((r: any) => r.id !== record.id);
    cache[`records_${record.projectId}`] = [...filtered, recordWithUser].sort((a, b) => a.dayNumber - b.dayNumber);
    saveCache(cache);
    
    // Non-blocking cloud sync
    setDoc(doc(db, 'records', record.id), recordWithUser).catch(() => {});
  },

  async deleteRecord(id: string): Promise<void> {
    // Non-blocking delete
    deleteDoc(doc(db, 'records', id)).catch(() => {});
  }
};
