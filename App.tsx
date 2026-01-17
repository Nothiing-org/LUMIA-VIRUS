import React, { useState, useEffect } from 'react';
import { Plus, Trash2, LayoutGrid, FileText, Sparkles, Brain } from 'lucide-react';
import { Project } from './types';
import NewProjectModal from './components/NewProjectModal';
import Dashboard from './components/Dashboard';
import SpecViewer from './components/SpecViewer';
import { storage } from './services/db';

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [view, setView] = useState<'HOME' | 'SPEC'>('HOME');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const saved = await storage.getProjects();
        setProjects(saved);
      } catch (error) {
        console.error("Failed to load projects:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadProjects();
  }, []);

  const addProject = async (p: Project) => {
    try {
      await storage.saveProject(p);
      setProjects([p, ...projects]);
      setShowNewModal(false);
      setActiveProject(p);
    } catch (error) {
      console.error("Failed to save new project:", error);
    }
  };

  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete project?')) {
      try {
        await storage.deleteProject(id);
        setProjects(projects.filter(p => p.id !== id));
      } catch (error) {
        console.error("Delete failed:", error);
      }
    }
  };

  if (activeProject) {
    return (
      <Dashboard 
        project={activeProject} 
        onBack={() => setActiveProject(null)}
        onUpdateProject={async (updated) => {
          try {
            await storage.saveProject(updated);
            setProjects(projects.map(p => p.id === updated.id ? updated : p));
            setActiveProject(updated);
          } catch (error) {
            console.error("Update failed:", error);
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      <nav className="border-b border-[#f0f0f0] sticky top-0 bg-white/90 backdrop-blur-xl z-40 px-6 lg:px-10 h-20 lg:h-24 flex items-center justify-between">
        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setView('HOME')}>
          <div className="w-2.5 h-2.5 bg-black rounded-full" />
          <span className="font-extrabold text-xl lg:text-2xl tracking-tighter">llumina</span>
        </div>
        
        <div className="flex items-center gap-4 lg:gap-10">
          <div className="hidden lg:flex items-center gap-10">
            <button onClick={() => setView('HOME')} className={`text-[10px] font-extrabold uppercase tracking-[0.3em] ${view === 'HOME' ? 'text-black' : 'text-zinc-400'}`}>Projects</button>
            <button onClick={() => setView('SPEC')} className={`text-[10px] font-extrabold uppercase tracking-[0.3em] ${view === 'SPEC' ? 'text-black' : 'text-zinc-400'}`}>Spec</button>
          </div>
          <button 
            onClick={() => setShowNewModal(true)}
            className="px-5 lg:px-8 py-3 lg:py-4 bg-black text-white rounded-2xl font-bold text-xs lg:text-sm hover:bg-zinc-800 transition-all active:scale-95 shadow-xl shadow-black/5"
          >
            New Project
          </button>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 lg:px-10 py-12 lg:py-20 ll-reveal">
        {view === 'SPEC' ? (
          <SpecViewer />
        ) : (
          <div className="space-y-12 lg:space-y-20">
            <header className="max-w-2xl space-y-4">
              <h1 className="text-4xl lg:text-7xl font-extrabold tracking-tighter leading-[0.9]">Signal, not noise.</h1>
              <p className="text-zinc-500 text-lg lg:text-xl font-medium">Follower progression reveals. Elite Multi-Modal Intelligence.</p>
            </header>

            {isLoading ? (
              <div className="flex py-20 justify-center lg:justify-start">
                <div className="w-6 h-6 border-2 border-zinc-100 border-t-black rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 pb-safe">
                {projects.map((project) => {
                  const isElite = project.isPro || project.name.toLowerCase().includes('llumina2026');
                  return (
                    <div 
                      key={project.id}
                      onClick={() => setActiveProject(project)}
                      className={`ll-card p-6 lg:p-10 flex flex-col gap-6 lg:gap-8 group cursor-pointer active:scale-[0.98] transition-all relative overflow-hidden ${isElite && 'ring-2 ring-indigo-500/20'}`}
                    >
                      {isElite && (
                        <div className="absolute top-0 right-0 p-10 pointer-events-none opacity-5">
                          <Brain className="w-64 h-64 text-indigo-500" />
                        </div>
                      )}
                      
                      <div className="aspect-[16/9] bg-zinc-50 rounded-[20px] lg:rounded-[24px] overflow-hidden relative">
                        <img src={project.baseImage} className={`w-full h-full object-cover transition-all duration-700 ${isElite ? 'grayscale-0' : 'grayscale group-hover:grayscale-0 opacity-60 group-hover:opacity-100'}`} alt="" />
                        <div className="absolute top-4 right-4 flex gap-2">
                           {isElite && (
                             <div className="px-3 py-1 bg-indigo-500 text-white rounded-full text-[7px] font-bold uppercase tracking-[0.2em] flex items-center gap-1 shadow-lg">
                               <Sparkles className="w-2 h-2" /> Elite Mode
                             </div>
                           )}
                           <div className="px-3 py-1 bg-white/90 rounded-full text-[8px] font-bold uppercase tracking-[0.2em]">{project.targetPlatform}</div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center relative z-10">
                        <div className="space-y-1">
                          <h3 className={`text-2xl lg:text-3xl font-extrabold tracking-tighter ${isElite && 'text-indigo-600'}`}>{project.name}</h3>
                          <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                            <span>{project.revealMode}</span>
                            <div className="w-1 h-1 bg-zinc-200 rounded-full" />
                            <span>{project.pixelsPerFollower} PX/F</span>
                            {isElite && (
                              <>
                                <div className="w-1 h-1 bg-indigo-200 rounded-full" />
                                <span className="text-indigo-400">32K Thinking Active</span>
                              </>
                            )}
                          </div>
                        </div>
                        <button 
                          onClick={(e) => deleteProject(project.id, e)} 
                          className="p-3 text-zinc-300 hover:text-black transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                <button 
                  onClick={() => setShowNewModal(true)}
                  className="ll-card border-2 border-dashed border-[#f0f0f0] p-12 lg:p-20 flex flex-col items-center justify-center gap-6 group hover:bg-zinc-50/50 transition-all"
                >
                  <div className="w-14 h-14 bg-zinc-50 rounded-full flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all shadow-sm">
                    <Plus className="w-7 h-7" />
                  </div>
                  <div className="text-center">
                    <span className="text-xl lg:text-2xl font-extrabold tracking-tighter block">Create Project</span>
                    <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-400">Add to llumina Cloud</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl border-t border-[#f0f0f0] h-20 px-10 flex items-center justify-around z-50 pb-safe">
        <button onClick={() => setView('HOME')} className={`flex flex-col items-center gap-1 ${view === 'HOME' ? 'text-black' : 'text-zinc-400'}`}>
          <LayoutGrid className="w-5 h-5" />
          <span className="text-[8px] font-bold uppercase tracking-widest">Home</span>
        </button>
        <button onClick={() => setView('SPEC')} className={`flex flex-col items-center gap-1 ${view === 'SPEC' ? 'text-black' : 'text-zinc-400'}`}>
          <FileText className="w-5 h-5" />
          <span className="text-[8px] font-bold uppercase tracking-widest">Spec</span>
        </button>
      </div>

      <footer className="hidden lg:flex border-t border-[#f0f0f0] py-20 px-10 bg-white">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-black rounded-full" />
            <span className="text-xs font-bold tracking-tighter">llumina © 2026</span>
          </div>
          <div className="flex gap-10 text-[9px] font-extrabold uppercase tracking-[0.3em] text-zinc-400">
            <span>Premium Intelligence</span>
            <span>Privacy First</span>
            <span>Signal Processing</span>
          </div>
        </div>
      </footer>

      {showNewModal && <NewProjectModal onClose={() => setShowNewModal(false)} onSave={addProject} />}
    </div>
  );
};

export default App;