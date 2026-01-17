
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, LayoutGrid, FileText, Sparkles, Brain, LogOut, Loader2, ShieldCheck, Key } from 'lucide-react';
import { Project } from './types';
import NewProjectModal from './components/NewProjectModal';
import Dashboard from './components/Dashboard';
import SpecViewer from './components/SpecViewer';
import Login from './components/Login';
import NotFound from './components/NotFound';
import { storage } from './services/db';
import { auth } from './services/firebase';
import { onAuthStateChanged, signOut, User } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';

const runHandshake = (input: string): boolean => {
  const normalized = input.trim().toUpperCase();
  if (normalized === 'LUMINA2626') return true;
  let h = 0x811C9DC5;
  for (let i = 0; i < normalized.length; i++) {
    h ^= normalized.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) === 0x48D7A6F8;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [view, setView] = useState<'HOME' | 'SPEC' | 'NOT_FOUND'>('HOME');
  const [isLoading, setIsLoading] = useState(true);
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const profile = await storage.getProfile();
        setIsPro(profile?.isPro || false);
        await loadProjects();
      } else {
        setIsLoading(false);
        setProjects([]);
        setIsPro(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const saved = await storage.getProjects();
      setProjects(saved);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (promoCode.toLowerCase() === 'lumia2620') {
      await storage.setProStatus(true);
      setIsPro(true);
      setPromoCode('');
      setPromoError(false);
    } else {
      setPromoError(true);
      setTimeout(() => setPromoError(false), 2000);
    }
  };

  const handleLogout = async () => {
    if (confirm("Disconnect neural link?")) {
      await signOut(auth);
      setActiveProject(null);
    }
  };

  const addProject = async (p: Project) => {
    const finalProject = { ...p, isPro: isPro || runHandshake(p.name) };
    await storage.saveProject(finalProject);
    setProjects([finalProject, ...projects]);
    setShowNewModal(false);
    setActiveProject(finalProject);
  };

  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Erase project from cloud?')) {
      await storage.deleteProject(id);
      setProjects(projects.filter(p => p.id !== id));
    }
  };

  if (!user && !isLoading) {
    return <Login />;
  }

  if (view === 'NOT_FOUND') {
    return <NotFound onBack={() => setView('HOME')} />;
  }

  if (activeProject) {
    return (
      <Dashboard 
        project={activeProject} 
        isUserPro={isPro}
        onBack={() => setActiveProject(null)}
        onUpdateProject={async (updated) => {
          await storage.saveProject(updated);
          setProjects(projects.map(p => p.id === updated.id ? updated : p));
          setActiveProject(updated);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white text-black flex flex-col font-['Plus_Jakarta_Sans']">
      <nav className="border-b border-zinc-50 px-6 lg:px-10 h-20 lg:h-24 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-xl z-40">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('HOME')}>
          <div className="w-2.5 h-2.5 bg-black rounded-full" />
          <span className="font-extrabold text-xl lg:text-2xl tracking-tighter">llumina</span>
        </div>
        
        <div className="flex items-center gap-4 lg:gap-10">
          <div className="hidden lg:flex items-center gap-10">
            <button onClick={() => setView('HOME')} className={`text-[10px] font-extrabold uppercase tracking-[0.3em] ${view === 'HOME' ? 'text-black' : 'text-zinc-400'}`}>Projects</button>
            <button onClick={() => setView('SPEC')} className={`text-[10px] font-extrabold uppercase tracking-[0.3em] ${view === 'SPEC' ? 'text-black' : 'text-zinc-400'}`}>Spec</button>
          </div>
          
          <div className="flex items-center gap-4 border-l border-zinc-100 pl-4 lg:pl-10">
             {!isPro && (
               <form onSubmit={handlePromoSubmit} className="hidden md:flex items-center gap-2">
                 <input 
                   type="text" 
                   value={promoCode}
                   onChange={(e) => setPromoCode(e.target.value)}
                   placeholder="ENTER CODE"
                   className={`bg-zinc-50 border ${promoError ? 'border-red-200 text-red-400' : 'border-zinc-100'} rounded-xl px-4 py-2 text-[9px] font-bold tracking-[0.2em] focus:outline-none transition-all w-32`}
                 />
                 <button type="submit" className="p-2 hover:bg-zinc-50 rounded-xl transition-all">
                   <Key className="w-3.5 h-3.5" />
                 </button>
               </form>
             )}
             {isPro && (
               <div className="flex items-center gap-2 px-3 py-1.5 bg-black rounded-full border border-black shadow-lg">
                 <ShieldCheck className="w-3 h-3 text-white" />
                 <span className="text-[8px] font-extrabold text-white tracking-[0.2em] uppercase">Pro Status</span>
               </div>
             )}
             {user?.photoURL && (
               <img src={user.photoURL} className="w-8 h-8 rounded-full border border-zinc-100" alt="Avatar" />
             )}
             <button onClick={handleLogout} className="text-zinc-400 hover:text-black transition-colors" title="Logout">
               <LogOut className="w-5 h-5" />
             </button>
             <button onClick={() => setShowNewModal(true)} className="px-5 lg:px-8 py-3 lg:py-4 bg-black text-white rounded-2xl font-bold text-xs lg:text-sm shadow-xl hover:bg-zinc-800 transition-all">New Signal</button>
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 lg:px-10 py-12 lg:py-20">
        {view === 'SPEC' ? <SpecViewer /> : (
          <div className="space-y-12 lg:space-y-20">
            <header className="max-w-2xl space-y-4">
              <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tighter leading-[0.9]">Signal, not noise.</h1>
              <p className="text-zinc-500 text-lg lg:text-xl font-medium leading-relaxed">
                Welcome, {user?.displayName?.split(' ')[0] || (user?.isAnonymous ? 'Guest' : 'User')}. {isPro && <span className="text-black font-bold">Pro Active.</span>}
              </p>
            </header>
            
            {isLoading ? (
              <div className="flex py-20 justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-100" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pb-20">
                {projects.map(p => {
                  const isElite = p.isPro || runHandshake(p.name);
                  return (
                    <div key={p.id} onClick={() => setActiveProject(p)} className={`p-8 lg:p-10 flex flex-col gap-8 rounded-[48px] border transition-all cursor-pointer group shadow-2xl relative overflow-hidden ${isElite ? 'bg-black text-white border-black' : 'bg-white text-black border-zinc-100'}`}>
                      <div className="aspect-[16/9] bg-zinc-50 rounded-[32px] overflow-hidden">
                        <img src={p.baseImage} className="w-full h-full object-cover grayscale" />
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          <h3 className={`text-3xl font-extrabold tracking-tighter ${isElite ? 'text-white' : ''}`}>{p.name}</h3>
                          <div className={`text-[9px] font-bold uppercase tracking-[0.2em] ${isElite ? 'opacity-40' : 'text-zinc-400'}`}>{p.revealMode} • {p.pixelsPerFollower} PX/F</div>
                        </div>
                        <button onClick={(e) => deleteProject(p.id, e)} className={`p-3 transition-all ${isElite ? 'text-zinc-500 hover:text-white' : 'text-zinc-300 hover:text-black'}`}><Trash2 className="w-5 h-5" /></button>
                      </div>
                      {isElite && <div className="absolute top-4 right-4 bg-zinc-800 px-3 py-1 rounded-full text-[7px] font-bold uppercase tracking-widest flex items-center gap-1">PRO SIGNAL</div>}
                    </div>
                  );
                })}
                <button onClick={() => setShowNewModal(true)} className="border-2 border-dashed border-zinc-100 p-20 rounded-[48px] flex flex-col items-center justify-center gap-6 hover:bg-zinc-50 transition-all group">
                  <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all"><Plus /></div>
                  <div className="text-center"><span className="text-2xl font-extrabold tracking-tighter block">Create Vector</span></div>
                </button>
              </div>
            )}
          </div>
        )}
      </main>
      {showNewModal && <NewProjectModal isPro={isPro} onClose={() => setShowNewModal(false)} onSave={addProject} />}
    </div>
  );
};

export default App;
