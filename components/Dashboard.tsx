
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, History, Video, ArrowDown, Settings, Loader2, Brain, X, Type, ShieldCheck, Volume2 } from 'lucide-react';
import { Project, DayRecord, TTSVoice } from '../types';
import { PixelEngine } from '../services/pixelEngine';
import { storage } from '../services/db';
import { GoogleGenAI, Modality, Type as SchemaType } from "@google/genai";

interface DashboardProps {
  project: Project;
  onBack: () => void;
  onUpdateProject: (p: Project) => void;
  isUserPro: boolean;
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

const VOICE_PERSONAS: Record<TTSVoice, string> = {
  Kore: "Professional, balanced, and authoritative. Best for corporate or tech signals.",
  Puck: "High-energy, youthful, and hype-focused. Best for viral spikes.",
  Charon: "Deep, mysterious, and cinematic. Best for dramatic 'dark' reveals.",
  Fenrir: "Aggressive, powerful, and intense. Best for massive milestones.",
  Zephyr: "Futuristic, sleek, and airy. Best for minimal or luxury aesthetic signals."
};

const Dashboard: React.FC<DashboardProps> = ({ project, onBack, onUpdateProject, isUserPro }) => {
  const [records, setRecords] = useState<DayRecord[]>([]);
  const [currentFollowers, setCurrentFollowers] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [activeDay, setActiveDay] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAIStrategy, setShowAIStrategy] = useState(false);

  const [manualScript, setManualScript] = useState(project.manualScript || '');
  const [isManualOverride, setIsManualOverride] = useState(!!project.manualScript);
  const [skipNarrative, setSkipNarrative] = useState(false);
  const [useAIAutoVoice, setUseAIAutoVoice] = useState(true);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PixelEngine | null>(null);
  const engineSeedRef = useRef<string | null>(null);
  const baseImageRef = useRef<HTMLImageElement | null>(null);
  const baseImageSrcRef = useRef<string | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const availableVoices: {id: TTSVoice, premium: boolean}[] = [
    { id: 'Kore', premium: false },
    { id: 'Puck', premium: false },
    { id: 'Charon', premium: true },
    { id: 'Fenrir', premium: true },
    { id: 'Zephyr', premium: true },
  ];

  useEffect(() => {
    const loadRecords = async () => {
      try {
        const saved = await storage.getRecords(project.id);
        setRecords(saved);
        if (saved.length > 0) {
          const last = saved[saved.length - 1];
          setActiveDay(last.dayNumber + 1);
        } else {
          setActiveDay(1);
        }
      } catch (err) {
        setError("History link unstable.");
      } finally {
        setIsLoading(false);
      }
    };
    loadRecords();
  }, [project.id]);

  const navigateToDay = useCallback((day: number) => {
    const existing = records.find(r => r.dayNumber === day);
    setActiveDay(day);
    if (existing) setCurrentFollowers(existing.followerCount);
    else setCurrentFollowers(0);
    engineRef.current?.resetMask();
  }, [records]);

  const drawFrame = useCallback((ctx: CanvasRenderingContext2D, followers: number, dayNum: number, zoom: number = 1.0, elapsed: number = 6000) => {
    const canvas = ctx.canvas;
    const img = baseImageRef.current;
    if (!img || !engineRef.current) return;
    if (!maskCanvasRef.current) {
      maskCanvasRef.current = document.createElement('canvas');
      maskCanvasRef.current.width = canvas.width;
      maskCanvasRef.current.height = canvas.height;
    }
    const maskCtx = maskCanvasRef.current.getContext('2d');
    if (!maskCtx) return;

    ctx.fillStyle = project.maskColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    const scale = Math.max(canvas.width / img.width, canvas.height / img.height) * zoom;
    const x = (canvas.width - img.width * scale) / 2;
    const y = (canvas.height - img.height * scale) / 2;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    ctx.restore();

    const pixelsToReveal = Math.floor(followers * project.pixelsPerFollower);
    const maskData = engineRef.current.generateMask(pixelsToReveal, project.maskColor);
    maskCtx.putImageData(maskData, 0, 0);
    ctx.drawImage(maskCanvasRef.current, 0, 0);

    ctx.save();
    ctx.fillStyle = 'white';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 15;
    ctx.textAlign = 'center';
    ctx.font = 'bold 54px "Plus Jakarta Sans"';
    ctx.fillText(`DAY ${dayNum}`, canvas.width / 2, 200);
    const label = project.revealMode === 'DELTA' ? 'NEW FOLLOWERS' : 'TOTAL FOLLOWERS';
    ctx.font = '40px "Plus Jakarta Sans"';
    ctx.fillText(`${Math.floor(followers).toLocaleString()} ${label}`, canvas.width / 2, 270);
    const percent = Math.min(100, (pixelsToReveal / (canvas.width * canvas.height)) * 100).toFixed(1);
    ctx.font = 'bold 120px "JetBrains Mono"';
    ctx.fillText(`${percent}%`, canvas.width / 2, canvas.height - 220);
    ctx.restore();
  }, [project.pixelsPerFollower, project.maskColor, project.revealMode]);

  useEffect(() => {
    if (isLoading) return;
    const initAndRender = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (!engineRef.current || engineSeedRef.current !== project.seed) {
        engineRef.current = new PixelEngine(canvas.width, canvas.height, project.seed);
        await engineRef.current.initialize();
        engineSeedRef.current = project.seed;
      }
      if (!baseImageRef.current || baseImageSrcRef.current !== project.baseImage) {
        const img = new Image();
        img.src = project.baseImage;
        await new Promise((res) => { img.onload = res; baseImageRef.current = img; });
        baseImageSrcRef.current = project.baseImage;
        engineRef.current.resetMask();
      }
      const ctx = canvas.getContext('2d', { alpha: false });
      if (ctx) {
        let displayFollowers = currentFollowers;
        if (project.revealMode === 'DELTA') {
          const previousTotal = records.filter(r => r.dayNumber < activeDay).reduce((acc, r) => acc + r.followerCount, 0);
          displayFollowers = previousTotal + currentFollowers;
        }
        drawFrame(ctx, displayFollowers, activeDay);
      }
    };
    initAndRender();
  }, [currentFollowers, project, records, activeDay, isLoading, drawFrame]);

  const handleSaveDay = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const existing = records.find(r => r.dayNumber === activeDay);
      const record: DayRecord = {
        id: existing?.id || crypto.randomUUID(),
        projectId: project.id,
        dayNumber: activeDay,
        followerCount: currentFollowers,
        timestamp: Date.now()
      };
      await storage.saveRecord(record);
      const newRecords = existing 
        ? records.map(r => r.dayNumber === activeDay ? record : r)
        : [...records, record].sort((a, b) => a.dayNumber - b.dayNumber);
      setRecords(newRecords);
      if (!existing) {
        setActiveDay(activeDay + 1);
        setCurrentFollowers(0);
      }
    } catch (err) { setError("Commit failed."); }
    finally { setIsProcessing(false); }
  };

  const exportVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isProcessing) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    setIsProcessing(true);

    const prevDayRec = records.find(r => r.dayNumber === activeDay - 1);
    const previousTotal = records.filter(r => r.dayNumber < activeDay).reduce((acc, r) => acc + r.followerCount, 0);
    const endVal = project.revealMode === 'DELTA' ? (previousTotal + currentFollowers) : currentFollowers;
    
    let audioBuffer: AudioBuffer | null = null;
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

    if (!skipNarrative) {
      setExportStatus('Analyzing Growth Logic...');
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        let finalScript = isManualOverride && manualScript ? manualScript : "";
        let finalVoice: TTSVoice = project.voiceName;
        
        if (!finalScript) {
          const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: `
              Analyze this follower reveal context:
              Project: ${project.name}
              Day Number: ${activeDay}
              Current Amplitude: ${endVal.toLocaleString()}
              Previous Record: ${prevDayRec ? prevDayRec.followerCount.toLocaleString() : 'N/A'}
              Mode: ${project.revealMode}

              TASK: 
              1. Choose the best TTS voice from: Kore, Puck, Charon, Fenrir, Zephyr.
              2. Write a short (6-10 words) high-impact script matching that voice's persona.
              Personas: 
              - Kore: Professional/Balanced
              - Puck: High-energy/Hype
              - Charon: Mysterious/Dark
              - Fenrir: Intense/Aggressive
              - Zephyr: Futuristic/Minimalist

              Return JSON format with keys: "script" (string) and "voice" (string).
            `,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: SchemaType.OBJECT,
                properties: {
                  script: { type: SchemaType.STRING },
                  voice: { type: SchemaType.STRING }
                },
                required: ["script", "voice"]
              }
            }
          });

          const result = JSON.parse(response.text || '{}');
          finalScript = result.script || "Signal established.";
          if (useAIAutoVoice && result.voice && availableVoices.find(v => v.id === result.voice)) {
            finalVoice = result.voice as TTSVoice;
          }
        }

        setExportStatus(`Synthesizing ${finalVoice} Narrative...`);
        const ttsResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text: finalScript }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: finalVoice } } },
          },
        });

        const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) audioBuffer = await pcmToAudioBuffer(decodeBase64(base64Audio), audioCtx);
      } catch (err) { 
        console.warn('Narrative intelligence failed, proceeding silent.'); 
      }
    }

    setExportStatus('Encoding Final Stream...');
    const stream = canvas.captureStream(30);
    const audioDest = audioCtx.createMediaStreamDestination();
    
    if (audioBuffer) {
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioDest);
      source.start();
    }
    
    const combined = new MediaStream([
      ...stream.getVideoTracks(),
      ...(audioBuffer ? audioDest.stream.getAudioTracks() : [])
    ]);

    const recorder = new MediaRecorder(combined, { 
      mimeType: 'video/webm;codecs=vp9', 
      videoBitsPerSecond: isUserPro ? 12000000 : 5000000 
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = () => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
      link.download = `llumina-D${activeDay}.webm`;
      link.click();
      setIsProcessing(false);
      setExportStatus('');
    };

    recorder.start();
    const duration = 6000;
    const start = performance.now();
    const animate = (time: number) => {
      const elapsed = time - start;
      const progress = Math.min(elapsed / 1000, 1.0);
      const startVal = isUserPro ? (records.find(r => r.dayNumber === activeDay-1)?.followerCount || 0) : endVal;
      const currentVal = startVal + (endVal - startVal) * (1 - Math.pow(1 - progress, 4));
      drawFrame(ctx, currentVal, activeDay, 1.0 + (Math.min(elapsed/duration, 1) * 0.05), elapsed);
      if (elapsed < duration) {
        setExportStatus(`Exporting ${Math.round((elapsed/duration)*100)}%`);
        requestAnimationFrame(animate);
      } else recorder.stop();
    };
    requestAnimationFrame(animate);
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-white text-black overflow-hidden font-['Plus_Jakarta_Sans']">
      <div className="w-full lg:w-[450px] lg:border-r border-[#f0f0f0] flex flex-col bg-white z-20 overflow-y-auto h-full">
        <div className="p-8 border-b border-[#f0f0f0] flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-lg z-30">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-zinc-50 rounded-xl transition-all"><ChevronLeft className="w-5 h-5" /></button>
            <h2 className="font-extrabold text-xl tracking-tighter truncate max-w-[150px]">{project.name}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setShowAIStrategy(!showAIStrategy); setShowHistory(false); setShowSettings(false); }} className={`p-2 rounded-xl transition-all ${showAIStrategy ? 'bg-black text-white' : 'text-zinc-300'}`}><Brain className="w-5 h-5" /></button>
            <button onClick={() => { setShowHistory(!showHistory); setShowAIStrategy(false); setShowSettings(false); }} className={`p-2 rounded-xl transition-all ${showHistory ? 'bg-black text-white' : 'text-zinc-300'}`}><History className="w-5 h-5" /></button>
            <button onClick={() => { setShowSettings(!showSettings); setShowAIStrategy(false); setShowHistory(false); }} className={`p-2 rounded-xl transition-all ${showSettings ? 'bg-black text-white' : 'text-zinc-300'}`}><Settings className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10">
          {!showHistory && !showSettings && !showAIStrategy && (
            <div className="space-y-10 ll-reveal">
               <div className="ll-card p-8 space-y-8">
                  <div className="space-y-2">
                    <label className="text-[8px] text-zinc-400 uppercase font-bold tracking-[0.3em]">Temporal Marker</label>
                    <div className="flex items-center gap-4">
                      <button onClick={() => navigateToDay(Math.max(1, activeDay - 1))} className="w-10 h-10 bg-zinc-50 rounded-xl font-bold hover:bg-zinc-100">-</button>
                      <span className="font-mono font-bold text-2xl w-12 text-center">{activeDay}</span>
                      <button onClick={() => navigateToDay(activeDay + 1)} className="w-10 h-10 bg-zinc-50 rounded-xl font-bold hover:bg-zinc-100">+</button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] text-zinc-400 uppercase font-bold tracking-[0.3em]">Signal Amplitude</label>
                    <input type="number" value={currentFollowers} onChange={(e) => setCurrentFollowers(parseInt(e.target.value) || 0)} className="w-full bg-[#f8f8f8] border-none rounded-2xl p-6 text-3xl font-mono focus:ring-1 ring-black/5 outline-none" placeholder="0" />
                  </div>
                  <button onClick={handleSaveDay} className="w-full py-6 bg-black text-white rounded-2xl font-bold text-sm tracking-widest hover:bg-zinc-900 transition-all">COMMIT VECTOR</button>
               </div>
            </div>
          )}

          {showSettings && (
            <div className="space-y-10 ll-reveal">
              <div className="space-y-8">
                <h3 className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-[0.4em]">Narrator Protocols</h3>
                
                <div className="space-y-4">
                   <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-widest text-zinc-400">
                     <span>Intelligence Engine</span>
                     {isUserPro && <span className="text-black bg-zinc-100 px-2 py-0.5 rounded-full">PRO</span>}
                   </div>
                   <div className="grid grid-cols-2 gap-2">
                     <button onClick={() => setUseAIAutoVoice(true)} className={`py-4 rounded-xl text-[8px] font-bold uppercase tracking-widest border transition-all ${useAIAutoVoice ? 'bg-black text-white border-black' : 'bg-white text-zinc-300 border-zinc-100'}`}>AI Auto-Voice</button>
                     <button onClick={() => setUseAIAutoVoice(false)} className={`py-4 rounded-xl text-[8px] font-bold uppercase tracking-widest border transition-all ${!useAIAutoVoice ? 'bg-black text-white border-black' : 'bg-white text-zinc-300 border-zinc-100'}`}>Fixed Manual</button>
                   </div>
                </div>

                <div className={`p-6 rounded-3xl border transition-all space-y-4 ${isManualOverride ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-100'}`}>
                   <div className="flex justify-between items-center">
                     <div className="flex items-center gap-2">
                        <Type className={`w-4 h-4 ${isManualOverride ? 'text-white' : 'text-zinc-400'}`} />
                        <span className={`text-[9px] font-extrabold uppercase tracking-widest ${isManualOverride ? 'text-white' : 'text-zinc-400'}`}>Manual Script</span>
                     </div>
                     <button 
                        onClick={() => { if(!isUserPro) return alert('PRO required'); setIsManualOverride(!isManualOverride); }}
                        className={`w-12 h-6 rounded-full p-1 transition-all ${isManualOverride ? 'bg-white' : 'bg-zinc-200'}`}
                      >
                        <div className={`w-4 h-4 rounded-full shadow-sm transition-all ${isManualOverride ? 'bg-black translate-x-6' : 'bg-white'}`} />
                      </button>
                   </div>
                   {isManualOverride && (
                     <textarea 
                        value={manualScript}
                        onChange={(e) => { setManualScript(e.target.value); onUpdateProject({...project, manualScript: e.target.value}); }}
                        placeholder="Write custom reveal script..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xs text-white focus:outline-none min-h-[80px] resize-none"
                     />
                   )}
                </div>

                <div className={`space-y-4 ${useAIAutoVoice ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                  <label className="text-[9px] uppercase font-bold text-zinc-400 tracking-[0.4em] block">Base Vocal Profile</label>
                  <div className="grid grid-cols-2 gap-2">
                    {availableVoices.map(v => (
                      <button 
                        key={v.id} 
                        onClick={() => { if(v.premium && !isUserPro) return alert('Premium Voice Required'); onUpdateProject({...project, voiceName: v.id}); }}
                        className={`p-4 rounded-xl text-[8px] font-bold uppercase tracking-widest border transition-all flex flex-col items-start gap-1 ${project.voiceName === v.id ? 'bg-black text-white border-black' : 'bg-white text-zinc-400 border-zinc-100'}`}
                      >
                        <div className="w-full flex justify-between">
                          {v.id}
                          {v.premium && <ShieldCheck className="w-3.5 h-3.5" />}
                        </div>
                        <span className="text-[6px] opacity-40 lowercase tracking-normal text-left">{VOICE_PERSONAS[v.id].split('.')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {showHistory && (
             <div className="space-y-6 ll-reveal">
               <h3 className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-[0.4em]">Signal Logs</h3>
               {records.slice().reverse().map(rec => (
                 <div key={rec.id} onClick={() => navigateToDay(rec.dayNumber)} className="p-6 bg-zinc-50 rounded-3xl flex justify-between items-center cursor-pointer hover:bg-zinc-100 transition-all">
                    <div>
                      <span className="text-[8px] font-bold text-zinc-400 block mb-1 uppercase tracking-widest">Day {rec.dayNumber}</span>
                      <span className="text-xl font-bold font-mono">{rec.followerCount.toLocaleString()}</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); storage.deleteRecord(rec.id).then(() => setRecords(prev => prev.filter(r => r.id !== rec.id))); }} className="p-2 text-zinc-200 hover:text-red-500 transition-all"><X className="w-4 h-4" /></button>
                 </div>
               ))}
             </div>
          )}
        </div>

        <div className="p-8 border-t border-[#f0f0f0] bg-white sticky bottom-0">
          <button 
            disabled={isProcessing} 
            onClick={exportVideo} 
            className="w-full py-6 bg-black text-white rounded-[24px] font-bold text-[10px] tracking-[0.3em] uppercase flex items-center justify-center gap-3 shadow-2xl shadow-black/20 hover:scale-[1.02] transition-all disabled:opacity-50"
          >
            {isProcessing ? <><Loader2 className="w-4 h-4 animate-spin" /> {exportStatus}</> : <><Video className="w-4 h-4" /> Generate Ultra Signal</>}
          </button>
        </div>
      </div>

      <div className="flex-1 bg-[#fafafa] flex items-center justify-center p-6 lg:p-12 relative">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1.2px, transparent 1.2px)', backgroundSize: '40px 40px' }} />
        <div className="relative aspect-[9/16] h-[90%] bg-white rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.1)] overflow-hidden border border-[#f0f0f0]">
           <canvas ref={canvasRef} width={1080} height={1920} className="w-full h-full object-contain" />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
