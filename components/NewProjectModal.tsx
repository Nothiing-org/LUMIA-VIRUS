import React, { useState } from 'react';
import { X, Upload, Check, ChevronRight, ChevronLeft, Volume2, PlayCircle, Sparkles, User, Mic2, Zap, Brain, Ghost, Shield, ZapOff, Activity } from 'lucide-react';
import { Project, RevealMode, Persona } from '../types';
import { GoogleGenAI, Modality } from "@google/genai";
import { validateProCode, sanitizeInput } from '../utils/security';

interface NewProjectModalProps {
  onClose: () => void;
  onSave: (project: Project) => void;
}

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function pcmToAudioBuffer(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < dataInt16.length; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
}

export const PERSONAS: Persona[] = [
  { id: 'p1', name: 'Ava', voiceId: 'Kore', trait: 'Minimalist', desc: 'Precise, calm, and clinical.', energy: 'MEDIUM', pacing: 'STEADY' },
  { id: 'p2', name: 'Leo', voiceId: 'Puck', trait: 'Hype', desc: 'High energy, viral-focused hooks.', energy: 'HIGH', pacing: 'FAST' },
  { id: 'p3', name: 'Nova', voiceId: 'Charon', trait: 'Cinematic', desc: 'Mysterious, deep, and enigmatic.', energy: 'LOW', pacing: 'SLOW' },
  { id: 'p4', name: 'Atlas', voiceId: 'Fenrir', trait: 'Titan', desc: 'Powerful, commanding, authoritative.', energy: 'HIGH', pacing: 'STEADY' },
  { id: 'p5', name: 'Sora', voiceId: 'Zephyr', trait: 'Dreamer', desc: 'Optimistic, community-driven, bright.', energy: 'MEDIUM', pacing: 'STEADY' },
  { id: 'p6', name: 'Vex', voiceId: 'Charon', trait: 'Glitch', desc: 'Aggressive, raw, and chaotic.', energy: 'HIGH', pacing: 'FAST' },
  { id: 'p7', name: 'Zion', voiceId: 'Fenrir', trait: 'Stoic', desc: 'Mechanical, cold, and calculated.', energy: 'LOW', pacing: 'SLOW' },
  { id: 'p8', name: 'Mina', voiceId: 'Kore', trait: 'Analyst', desc: 'Rapid-fire, data-heavy reporting.', energy: 'HIGH', pacing: 'FAST' },
];

const NewProjectModal: React.FC<NewProjectModalProps> = ({ onClose, onSave }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [seed, setSeed] = useState(Math.random().toString(36).substring(7));
  const [multiplier, setMultiplier] = useState(10);
  const [mode, setMode] = useState<RevealMode>('TOTAL');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('p1');
  const [isPreviewing, setIsPreviewing] = useState<string | null>(null);
  const [audioSource, setAudioSource] = useState<AudioBufferSourceNode | null>(null);
  const [isElite, setIsElite] = useState(false);
  const [proCode, setProCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const checkProCode = async (val: string) => {
    setProCode(val);
    if (val.length >= 11) {
      setIsValidating(true);
      const isValid = await validateProCode(val);
      setIsElite(isValid);
      setIsValidating(false);
    } else {
      setIsElite(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const playVoicePreview = async (persona: Persona) => {
    if (audioSource) {
      try { audioSource.stop(); } catch(e) {}
      setAudioSource(null);
    }

    setIsPreviewing(persona.id);
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const contextText = isElite ? "Elite Access Granted." : "";
      const sampleText = `${contextText} Hello. I am ${persona.name}. Calibrated for ${persona.trait.toLowerCase()} synthesis. Sequence active.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: sampleText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: persona.voiceId },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const decoded = decodeBase64(base64Audio);
        const buffer = await pcmToAudioBuffer(decoded, audioCtx);
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.start();
        setAudioSource(source);
        source.onended = () => {
          setIsPreviewing(null);
          setAudioSource(null);
          audioCtx.close();
        };
      } else {
        setIsPreviewing(null);
      }
    } catch (err) {
      console.error("Preview failed:", err);
      setIsPreviewing(null);
      audioCtx.close();
    }
  };

  const handlePersonaSelect = (p: Persona) => {
    setSelectedPersonaId(p.id);
    playVoicePreview(p);
  };

  const handleComplete = () => {
    if (!name || !image) return;
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: sanitizeInput(name),
      targetPlatform: 'TikTok', 
      resolution: { width: 1080, height: 1920 },
      baseImage: image,
      maskColor: '#000000',
      seed,
      pixelsPerFollower: multiplier,
      revealMode: mode,
      personaId: selectedPersonaId,
      createdAt: Date.now(),
      isPro: isElite
    };
    onSave(newProject);
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center lg:p-10 font-['Plus_Jakarta_Sans'] overflow-y-auto transition-colors duration-1000 ${isElite ? 'bg-[#030712]/95 backdrop-blur-3xl' : 'bg-white/95 backdrop-blur-3xl'}`}>
      <div className={`w-full max-w-4xl h-full lg:h-auto lg:rounded-[48px] flex flex-col shadow-[0_40px_120px_rgba(0,0,0,0.15)] ll-reveal pb-safe transition-all duration-1000 border ${isElite ? 'bg-[#030712] border-indigo-500/20 shadow-indigo-500/10' : 'bg-white border-[#f0f0f0]'}`}>
        
        <div className={`p-8 lg:p-12 border-b flex items-center justify-between sticky top-0 backdrop-blur-md z-10 ${isElite ? 'border-indigo-500/20 bg-[#030712]/80' : 'border-[#f0f0f0] bg-white/80'}`}>
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full animate-pulse ${isElite ? 'bg-indigo-400 shadow-[0_0_15px_rgba(129,140,248,0.5)]' : 'bg-black'}`} />
            <h2 className={`text-2xl lg:text-3xl font-extrabold tracking-tighter ${isElite ? 'text-white' : 'text-black'}`}>
              {isElite ? 'Quantum Initialization' : 'Signal Initialization'}
            </h2>
          </div>
          <button onClick={onClose} className={`p-3 rounded-3xl transition-all ${isElite ? 'hover:bg-indigo-500/10 text-zinc-400' : 'hover:bg-zinc-100 text-black'}`}>
            <X className="w-8 h-8" />
          </button>
        </div>

        <div className="flex-1 p-8 lg:p-16 space-y-12 lg:space-y-16">
          <div className="flex gap-3">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`h-2 flex-1 rounded-full transition-all duration-700 ${step >= s ? (isElite ? 'bg-indigo-400' : 'bg-black') : (isElite ? 'bg-white/5' : 'bg-zinc-100')}`} />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-12 ll-reveal">
              <div className="space-y-6 text-center max-w-xl mx-auto">
                <h3 className={`text-4xl font-extrabold tracking-tighter ${isElite ? 'text-indigo-100' : 'text-black'}`}>What is the signal?</h3>
                <p className="text-zinc-500 font-medium">Define your project identity. This will be the metadata for every generated reveal.</p>
              </div>
              <div className="space-y-8 max-w-2xl mx-auto">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <label className="text-[10px] uppercase font-extrabold text-zinc-400 tracking-[0.4em] block text-center">Campaign Designation</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. PROJECT_OMEGA"
                      className={`w-full border rounded-[24px] p-8 text-3xl font-extrabold tracking-tighter text-center focus:outline-none transition-all ${isElite ? 'bg-white/5 border-indigo-500/20 text-indigo-300 focus:border-indigo-500/50' : 'bg-[#f8f8f8] border-[#f0f0f0] focus:border-black/20'}`}
                      autoFocus
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] uppercase font-extrabold text-zinc-400 tracking-[0.4em] block text-center">Elite Access Code (Optional)</label>
                    <div className="relative">
                      <input
                        type="password"
                        value={proCode}
                        onChange={(e) => checkProCode(e.target.value)}
                        placeholder="••••••••••••"
                        className={`w-full border rounded-[20px] p-4 text-center font-mono focus:outline-none transition-all ${isElite ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' : 'bg-[#f8f8f8] border-[#f0f0f0]'}`}
                      />
                      {isValidating && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    {isElite && (
                      <div className="flex justify-center animate-pulse">
                        <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-4 py-1.5 rounded-full border border-indigo-500/20">Elite Protocol Detected</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button 
                disabled={!name}
                onClick={() => setStep(2)}
                className={`w-full max-w-2xl mx-auto py-8 font-bold rounded-[32px] text-lg disabled:opacity-20 transition-all flex items-center justify-center gap-3 shadow-2xl hover:translate-y-[-2px] ${isElite ? 'bg-indigo-600 text-white shadow-indigo-500/20 hover:bg-indigo-500' : 'bg-black text-white shadow-black/10'}`}
              >
                Define Source Media <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {step === 2 && (
             <div className="space-y-12 ll-reveal">
                <div className="space-y-6 text-center max-w-xl mx-auto">
                  <h3 className={`text-4xl font-extrabold tracking-tighter ${isElite ? 'text-indigo-100' : 'text-black'}`}>Source Asset</h3>
                  <p className="text-zinc-500 font-medium">Upload a vertical high-fidelity image for progression.</p>
                </div>
                <div className="max-w-xl mx-auto">
                  <label className={`block border-2 border-dashed rounded-[48px] p-16 lg:p-24 hover:border-indigo-500/20 cursor-pointer transition-all text-center group relative overflow-hidden ${isElite ? 'bg-white/5 border-indigo-500/10' : 'bg-zinc-50/20 border-[#f0f0f0]'}`}>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    {image ? (
                      <div className="relative z-10">
                        <img src={image} className="max-h-72 mx-auto rounded-3xl shadow-2xl" alt="Preview" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                          <div className="bg-white/90 backdrop-blur px-8 py-4 rounded-full text-[10px] font-extrabold uppercase tracking-widest shadow-xl text-black">Swap Asset</div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-8">
                        <div className={`w-20 h-20 rounded-[32px] flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform ${isElite ? 'bg-indigo-500 text-white' : 'bg-white text-black'}`}>
                          <Upload className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                          <span className={`font-extrabold text-2xl tracking-tighter block ${isElite ? 'text-white' : 'text-black'}`}>Upload Base Image</span>
                          <span className="text-[10px] uppercase font-extrabold tracking-[0.3em] text-zinc-400">9:16 Vertical Matrix</span>
                        </div>
                      </div>
                    )}
                  </label>
                </div>
                <div className="flex gap-4 max-w-xl mx-auto">
                  <button onClick={() => setStep(1)} className={`p-8 rounded-[32px] transition-all ${isElite ? 'bg-white/5 text-zinc-400' : 'bg-zinc-50'}`}><ChevronLeft className="w-6 h-6" /></button>
                  <button 
                    disabled={!image}
                    onClick={() => setStep(3)}
                    className={`flex-1 py-8 font-bold rounded-[32px] disabled:opacity-20 transition-all shadow-2xl flex items-center justify-center gap-3 ${isElite ? 'bg-indigo-600 text-white' : 'bg-black text-white'}`}
                  >
                    Configure Logic <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
          )}

          {step === 3 && (
            <div className="space-y-12 ll-reveal max-w-2xl mx-auto">
               <div className="space-y-6 text-center">
                  <h3 className={`text-4xl font-extrabold tracking-tighter ${isElite ? 'text-indigo-100' : 'text-black'}`}>Synthesis Logic</h3>
                  <p className="text-zinc-500 font-medium">Deterministic reveal parameters.</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-[10px] uppercase font-extrabold text-zinc-400 tracking-[0.4em] block">Reveal Algorithm</label>
                    <div className={`flex gap-2 p-2 rounded-[24px] border ${isElite ? 'bg-white/5 border-indigo-500/20' : 'bg-[#f8f8f8] border-[#f0f0f0]'}`}>
                      <button onClick={() => setMode('TOTAL')} className={`flex-1 py-5 rounded-[18px] text-[10px] font-extrabold tracking-widest uppercase transition-all ${mode === 'TOTAL' ? (isElite ? 'bg-indigo-500 text-white' : 'bg-white shadow-md text-black') : 'text-zinc-400'}`}>Cumulative</button>
                      <button onClick={() => setMode('DELTA')} className={`flex-1 py-5 rounded-[18px] text-[10px] font-extrabold tracking-widest uppercase transition-all ${mode === 'DELTA' ? (isElite ? 'bg-indigo-500 text-white' : 'bg-white shadow-md text-black') : 'text-zinc-400'}`}>Interval</button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] uppercase font-extrabold text-zinc-400 tracking-[0.4em] block">Pixel Density</label>
                    <input 
                      type="number"
                      value={multiplier}
                      onChange={(e) => setMultiplier(parseInt(e.target.value))}
                      className={`w-full border rounded-[24px] p-6 font-mono font-bold text-2xl text-center focus:outline-none ${isElite ? 'bg-white/5 border-indigo-500/20 text-white' : 'bg-[#f8f8f8] border-[#f0f0f0]'}`}
                    />
                  </div>
                </div>
                <div className="flex gap-4 pt-8">
                  <button onClick={() => setStep(2)} className={`p-8 rounded-[32px] transition-all ${isElite ? 'bg-white/5 text-zinc-400' : 'bg-zinc-50'}`}><ChevronLeft className="w-6 h-6" /></button>
                  <button onClick={() => setStep(4)} className={`flex-1 py-8 font-bold rounded-[32px] transition-all shadow-2xl flex items-center justify-center gap-3 ${isElite ? 'bg-indigo-600 text-white' : 'bg-black text-white'}`}>Deploy Agent <ChevronRight className="w-5 h-5" /></button>
                </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-12 ll-reveal">
              <div className="space-y-6 text-center max-w-xl mx-auto">
                <h3 className={`text-4xl font-extrabold tracking-tighter ${isElite ? 'text-indigo-100' : 'text-black'}`}>Deploy AI Agent</h3>
                <p className="text-zinc-500 font-medium">Selecting an agent will automatically play their voice calibration signal.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-h-[500px] overflow-y-auto px-2 py-4 custom-scrollbar">
                {PERSONAS.map((p) => {
                  const Icon = p.trait === 'Glitch' ? Ghost : p.trait === 'Titan' ? Shield : User;
                  const isSelected = selectedPersonaId === p.id;
                  const isCurrentlyPlaying = isPreviewing === p.id;

                  return (
                    <div 
                      key={p.id}
                      onClick={() => handlePersonaSelect(p)}
                      className={`relative p-8 rounded-[32px] border-2 transition-all cursor-pointer group flex flex-col items-center text-center gap-4 ${isSelected ? (isElite ? 'border-indigo-400 bg-indigo-500/10 shadow-indigo-500/20' : 'border-black bg-zinc-50 shadow-xl') : (isElite ? 'border-white/5 hover:border-white/20' : 'border-[#f0f0f0] hover:border-zinc-200')}`}
                    >
                      <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center shadow-lg transition-all ${isSelected ? (isElite ? 'bg-indigo-400 text-white shadow-[0_0_20px_rgba(129,140,248,0.5)]' : 'bg-black text-white') : (isElite ? 'bg-white/5 text-zinc-500' : 'bg-white text-zinc-400')}`}>
                        <Icon className="w-8 h-8" />
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center justify-center gap-2">
                          <h4 className={`font-extrabold text-xl tracking-tighter ${isSelected ? (isElite ? 'text-indigo-200' : 'text-black') : (isElite ? 'text-white/40' : 'text-zinc-400')}`}>{p.name}</h4>
                          {isCurrentlyPlaying && (
                             <div className="flex gap-0.5 items-end h-3">
                                {[1, 2, 3].map(i => <div key={i} className={`w-0.5 bg-indigo-400 rounded-full animate-bounce`} style={{ animationDelay: `${i*0.2}s`, height: `${40 + Math.random()*60}%` }} />)}
                             </div>
                          )}
                        </div>
                        <div className="flex flex-wrap justify-center gap-1">
                           <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${isSelected ? (isElite ? 'bg-indigo-500 text-white' : 'bg-zinc-100 text-zinc-500') : (isElite ? 'bg-white/5 text-zinc-500' : 'bg-zinc-100 text-zinc-400')}`}>{p.trait}</span>
                        </div>
                      </div>

                      <p className={`text-[10px] font-medium leading-relaxed ${isSelected ? (isElite ? 'text-indigo-200/60' : 'text-zinc-500') : 'text-zinc-400'}`}>{p.desc}</p>

                      {isSelected && isCurrentlyPlaying && (
                         <div className="mt-2 text-[8px] font-extrabold uppercase tracking-[0.2em] text-indigo-400 animate-pulse">Syncing Audio...</div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-4 pt-8 max-w-2xl mx-auto">
                <button onClick={() => setStep(3)} className={`p-8 rounded-[32px] transition-all ${isElite ? 'bg-white/5 text-zinc-400 hover:bg-white/10' : 'bg-zinc-50 hover:bg-zinc-100'}`}><ChevronLeft className="w-6 h-6" /></button>
                <button 
                  onClick={handleComplete}
                  className={`flex-1 py-8 font-bold rounded-[32px] transition-all flex items-center justify-center gap-4 shadow-2xl text-lg group ${isElite ? 'bg-indigo-600 text-white shadow-indigo-500/20 hover:bg-indigo-500' : 'bg-black text-white hover:bg-zinc-800'}`}
                >
                  <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                  {isElite ? 'Confirm Quantum Launch' : 'Launch Synthesis'}
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
