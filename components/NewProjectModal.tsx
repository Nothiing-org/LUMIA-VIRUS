
import React, { useState } from 'react';
import { X, Upload, Check, ChevronRight, ChevronLeft, ShieldCheck, Loader2, Volume2 } from 'lucide-react';
import { Project, RevealMode, TTSVoice } from '../types';

interface NewProjectModalProps {
  onClose: () => void;
  onSave: (project: Project) => Promise<void>;
  isPro: boolean;
}

const NewProjectModal: React.FC<NewProjectModalProps> = ({ onClose, onSave, isPro }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [seed, setSeed] = useState(Math.random().toString(36).substring(7));
  const [multiplier, setMultiplier] = useState(10);
  const [mode, setMode] = useState<RevealMode>('TOTAL');
  const [voice, setVoice] = useState<TTSVoice>('Kore');
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableVoices: {id: TTSVoice, premium: boolean}[] = [
    { id: 'Kore', premium: false },
    { id: 'Puck', premium: false },
    { id: 'Charon', premium: true },
    { id: 'Fenrir', premium: true },
    { id: 'Zephyr', premium: true },
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleComplete = async () => {
    if (!name || !image || isInitializing) return;
    setIsInitializing(true);
    setError(null);
    
    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      targetPlatform: 'TikTok', 
      resolution: { width: 1080, height: 1920 },
      baseImage: image,
      maskColor: '#000000',
      seed,
      pixelsPerFollower: multiplier,
      revealMode: mode,
      voiceName: voice,
      createdAt: Date.now(),
      isPro: isPro,
    };

    try {
      await onSave(newProject);
    } catch (err: any) {
      console.error(err);
      setError("System interrupt. Check neural link.");
      setIsInitializing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white/90 backdrop-blur-2xl z-50 flex items-center justify-center lg:p-10 font-['Plus_Jakarta_Sans'] overflow-y-auto">
      <div className="bg-white lg:border lg:border-[#f0f0f0] w-full max-w-2xl h-full lg:h-auto lg:rounded-[40px] flex flex-col shadow-[0_40px_100px_rgba(0,0,0,0.1)] ll-reveal pb-safe">
        
        <div className="p-8 lg:p-10 border-b border-[#f0f0f0] flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-black rounded-full" />
            <h2 className="text-xl lg:text-2xl font-extrabold tracking-tighter">New Signal</h2>
          </div>
          {isPro && (
             <div className="px-3 py-1 bg-black text-white text-[8px] font-bold rounded-full uppercase tracking-widest flex items-center gap-1.5">
               <ShieldCheck className="w-3 h-3" /> PRO Synthesis
             </div>
          )}
          <button onClick={onClose} className="p-2 hover:bg-zinc-50 rounded-2xl transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 p-8 lg:p-12 space-y-10 lg:space-y-12">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-[10px] font-bold text-red-500 uppercase tracking-widest text-center">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-700 ${step >= s ? 'bg-black' : 'bg-zinc-100'}`} />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-10 ll-reveal">
              <div className="space-y-4">
                <label className="text-[9px] uppercase font-bold text-zinc-400 tracking-[0.4em] block">Identity</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Campaign Title"
                  className="w-full bg-[#f8f8f8] border border-[#f0f0f0] rounded-[18px] p-6 lg:p-8 text-2xl font-extrabold tracking-tighter focus:outline-none focus:border-black/10"
                />
              </div>
              <button disabled={!name} onClick={() => setStep(2)} className="w-full py-6 bg-black text-white font-bold rounded-2xl text-sm disabled:opacity-20 transition-all flex items-center justify-center gap-2">
                Proceed to Visualization <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-10 ll-reveal">
              <div className="space-y-4">
                <label className="text-[9px] uppercase font-bold text-zinc-400 tracking-[0.4em] block">Source Media</label>
                <label className="block border-2 border-dashed border-[#f0f0f0] rounded-[32px] p-10 lg:p-16 hover:border-black/20 cursor-pointer transition-all text-center bg-zinc-50/20 group">
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  {image ? (
                    <div className="relative">
                      <img src={image} className="max-h-60 mx-auto rounded-2xl grayscale group-hover:grayscale-0 transition-all shadow-xl" alt="Preview" />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-6">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <Upload className="w-6 h-6" />
                      </div>
                      <span className="font-extrabold text-xl tracking-tighter block">Select Signal Base</span>
                    </div>
                  )}
                </label>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="p-6 bg-zinc-50 rounded-2xl"><ChevronLeft className="w-5 h-5" /></button>
                <button disabled={!image} onClick={() => setStep(3)} className="flex-1 py-6 bg-black text-white font-bold rounded-2xl disabled:opacity-20 transition-all">
                  Configure Synthesis
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-10 ll-reveal">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[9px] uppercase font-bold text-zinc-400 tracking-[0.4em] block">Signal Mode</label>
                  <div className="flex gap-2 p-1.5 bg-[#f8f8f8] rounded-[18px]">
                    <button onClick={() => setMode('TOTAL')} className={`flex-1 py-3 rounded-xl text-[9px] font-extrabold tracking-widest uppercase transition-all ${mode === 'TOTAL' ? 'bg-white shadow-sm' : 'text-zinc-400'}`}>Total</button>
                    <button onClick={() => setMode('DELTA')} className={`flex-1 py-3 rounded-xl text-[9px] font-extrabold tracking-widest uppercase transition-all ${mode === 'DELTA' ? 'bg-white shadow-sm' : 'text-zinc-400'}`}>Delta</button>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[9px] uppercase font-bold text-zinc-400 tracking-[0.4em] block">Load (PX/F)</label>
                  <input type="number" value={multiplier} onChange={(e) => setMultiplier(parseInt(e.target.value))} className="w-full bg-[#f8f8f8] border border-[#f0f0f0] rounded-[18px] p-4 font-mono font-bold" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setStep(2)} className="p-6 bg-zinc-50 rounded-2xl"><ChevronLeft className="w-5 h-5" /></button>
                <button onClick={() => setStep(4)} className="flex-1 py-6 bg-black text-white font-bold rounded-2xl hover:bg-zinc-800 transition-all">
                  Voice Selection
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-10 ll-reveal">
              <div className="space-y-6">
                <label className="text-[9px] uppercase font-bold text-zinc-400 tracking-[0.4em] block">Narration Voice</label>
                <div className="grid grid-cols-2 gap-3">
                  {availableVoices.map(v => (
                    <button 
                      key={v.id} 
                      onClick={() => { if(v.premium && !isPro) return alert('Premium Voice Required'); setVoice(v.id); }}
                      className={`p-5 rounded-[18px] text-[10px] font-extrabold uppercase tracking-widest border transition-all flex items-center justify-between ${voice === v.id ? 'bg-black text-white border-black shadow-lg' : 'bg-[#f8f8f8] text-zinc-400 border-[#f0f0f0] hover:bg-zinc-100'}`}
                    >
                      {v.id}
                      {v.premium && <ShieldCheck className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(3)} className="p-6 bg-zinc-50 rounded-2xl"><ChevronLeft className="w-5 h-5" /></button>
                <button 
                  disabled={isInitializing}
                  onClick={handleComplete}
                  className="flex-1 py-6 bg-black text-white font-bold rounded-2xl hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
                >
                  {isInitializing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  {isInitializing ? 'Establishing...' : 'Initialize Project'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewProjectModal;
