import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ChevronLeft, Play, Pause, Save, History, Plus, Video, 
  Image as ImageIcon, AlertCircle, Trash2, Volume2, VolumeX, 
  ArrowDown, Settings, Upload, RefreshCw, Sparkles, Database, 
  User, Brain, Send, Zap, Loader2, X, Maximize, CheckCircle2, Ghost, Shield, Globe, Layers
} from 'lucide-react';
import { Project, DayRecord, TTSVoice, Persona } from '../types';
import { PixelEngine } from '../services/pixelEngine';
import { storage } from '../services/db';
import { GoogleGenAI, Modality } from "@google/genai";
import { PERSONAS } from './NewProjectModal';
import { sanitizeInput, obfuscateData } from '../utils/security';

interface DashboardProps {
  project: Project;
  onBack: () => void;
  onUpdateProject: (p: Project) => void;
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

const Dashboard: React.FC<DashboardProps> = ({ project, onBack, onUpdateProject }) => {
  const [records, setRecords] = useState<DayRecord[]>([]);
  const [currentFollowers, setCurrentFollowers] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [activeDay, setActiveDay] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStrategist, setShowStrategist] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // AI Strategist States
  const [strategistQuery, setStrategistQuery] = useState('');
  const [strategistResponse, setStrategistResponse] = useState<string | null>(null);
  const [groundingSources, setGroundingSources] = useState<any[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [quickTip, setQuickTip] = useState<string | null>(null);

  // Video Player States
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [videoIsPlaying, setVideoIsPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoVolume, setVideoVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [isControlsVisible, setIsControlsVisible] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PixelEngine | null>(null);
  const engineSeedRef = useRef<string | null>(null);
  const baseImageRef = useRef<HTMLImageElement | null>(null);
  const baseImageSrcRef = useRef<string | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const controlsTimeoutRef = useRef<number | null>(null);

  const isElite = project.isPro || project.name.toLowerCase().includes('llumina2026');
  const activePersona = PERSONAS.find(p => p.id === project.personaId) || PERSONAS[0];

  useEffect(() => {
    const loadRecords = async () => {
      try {
        const saved = await storage.getRecords(project.id);
        setRecords(saved);
        if (saved.length > 0) {
          const last = saved[saved.length - 1];
          setActiveDay(last.dayNumber + 1);
          setCurrentFollowers(0);
        } else {
          setActiveDay(1);
          setCurrentFollowers(0);
        }
      } catch (err) {
        setError("History load failed.");
      } finally {
        setIsLoading(false);
      }
    };
    loadRecords();
  }, [project.id]);

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    setIsControlsVisible(true);
    if (controlsTimeoutRef.current) window.clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (videoIsPlaying) setIsControlsVisible(false);
    }, 3000);
  };

  const navigateToDay = useCallback((day: number) => {
    const existing = records.find(r => r.dayNumber === day);
    setActiveDay(day);
    if (existing) {
      setCurrentFollowers(existing.followerCount);
    } else {
      setCurrentFollowers(0);
    }
    engineRef.current?.resetMask();
    setGeneratedVideoUrl(null); 
    if (window.innerWidth < 1024) {
      setShowHistory(false);
      setShowSettings(false);
      setShowStrategist(false);
    }
  }, [records]);

  const drawFrame = useCallback((
    ctx: CanvasRenderingContext2D, 
    followers: number, 
    dayNum: number, 
    zoom: number = 1.0,
    elapsed: number = 15000 
  ) => {
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

    // Create temporary canvas for image processing
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.drawImage(img, x, y, img.width * scale, img.height * scale);
      const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);

      // Apply Elite Design Filters
      if (isElite) {
        engineRef.current.applyDesignFilter(imageData, 'NEON');
      }

      // Apply Glitch Effect if Persona is Vex or isElite
      if (activePersona.trait === 'Glitch' || (isElite && Math.random() < 0.05)) {
        engineRef.current.applyGlitch(imageData, activePersona.trait === 'Glitch' ? 0.3 : 0.1);
      }

      tempCtx.putImageData(imageData, 0, 0);
      ctx.drawImage(tempCanvas, 0, 0);
    } else {
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    }

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

    // PREMIUM: Quantum Scan Effect
    if (isElite && elapsed < 10000) {
      const scanY = (elapsed % 2000) / 2000 * canvas.height;
      const grad = ctx.createLinearGradient(0, scanY - 50, 0, scanY + 50);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.5, 'rgba(99, 102, 241, 0.2)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, scanY - 50, canvas.width, 100);
      
      // Floating particles
      ctx.fillStyle = 'white';
      for(let i=0; i<5; i++) {
        const px = Math.sin(elapsed/500 + i) * 200 + canvas.width/2;
        const py = (elapsed/10 + i*100) % canvas.height;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI*2);
        ctx.fill();
      }
    }

    ctx.font = 'bold 54px "Plus Jakarta Sans"';
    ctx.fillText(`DAY ${dayNum}`, canvas.width / 2, 200);
    
    const isTicking = elapsed < 1000;
    const cursor = (isTicking && Math.floor(elapsed / 100) % 2 === 0) ? '_' : '';
    
    ctx.font = '40px "Plus Jakarta Sans"';
    const label = project.revealMode === 'DELTA' ? 'NEW FOLLOWERS' : 'TOTAL FOLLOWERS';
    ctx.fillText(`${Math.floor(followers).toLocaleString()}${cursor} ${label}`, canvas.width / 2, 270);
    
    const totalPixels = canvas.width * canvas.height;
    const currentPixels = Math.floor(followers * project.pixelsPerFollower);
    const percent = Math.min(100, (currentPixels / totalPixels) * 100).toFixed(1);
    
    ctx.font = '32px "JetBrains Mono"';
    ctx.fillStyle = isTicking ? 'rgba(255, 255, 255, 1.0)' : 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(`${currentPixels.toLocaleString()} PIXELS`, canvas.width / 2, canvas.height - 350);

    ctx.font = 'bold 120px "JetBrains Mono"';
    ctx.fillStyle = isElite ? '#A5B4FC' : 'white'; // Indigo for Elite
    ctx.fillText(`${percent}%`, canvas.width / 2, canvas.height - 220);
    
    if (isTicking) {
        ctx.font = 'bold 20px "JetBrains Mono"';
        ctx.fillStyle = isElite ? 'rgba(165, 180, 252, 0.6)' : 'rgba(255, 255, 255, 0.5)';
        ctx.fillText(isElite ? 'QUANTUM SYNCING...' : 'SIGNAL SYNCING...', canvas.width / 2, canvas.height - 120);
        
        const barWidth = 200;
        const progress = elapsed / 1000;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect((canvas.width - barWidth) / 2, canvas.height - 100, barWidth, 4);
        ctx.fillStyle = isElite ? '#818CF8' : 'white';
        ctx.fillRect((canvas.width - barWidth) / 2, canvas.height - 100, barWidth * progress, 4);
    }

    ctx.restore();
  }, [project.pixelsPerFollower, project.maskColor, project.revealMode, isElite]);

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
    const existing = records.find(r => r.dayNumber === activeDay);
    if (existing && !window.confirm(`Day ${activeDay} exists. Overwrite?`)) return;

    setIsSyncing(true);
    const newRecord: DayRecord = {
      id: existing ? existing.id : crypto.randomUUID(),
      projectId: project.id,
      dayNumber: activeDay,
      followerCount: currentFollowers,
      timestamp: Date.now()
    };
    
    try {
      await storage.saveRecord(newRecord);
      setRecords(prev => {
        const filtered = prev.filter(r => r.dayNumber !== activeDay);
        const updated = [...filtered, newRecord].sort((a, b) => a.dayNumber - b.dayNumber);
        return updated;
      });

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const tipRes = await ai.models.generateContent({
        model: isElite ? 'gemini-3-pro-preview' : 'gemini-2.5-flash-lite-latest',
        contents: `Generate a short viral marketing tip for a creator on day ${activeDay} who just gained ${currentFollowers} followers. Persona: ${activePersona.name}. Tone: ${activePersona.trait}.`,
        config: isElite ? { tools: [{ googleSearch: {} }] } : {}
      });
      setQuickTip(tipRes.text || "Keep the momentum high!");

      if (!existing || activeDay >= records[records.length - 1]?.dayNumber) {
        navigateToDay(activeDay + 1);
      }
      setError(null);
    } catch (err) {
      setError("Persistence error.");
    } finally {
      setTimeout(() => setIsSyncing(false), 1000);
    }
  };

  const quantumOptimizeScript = async () => {
    if (!isElite) return;
    setIsProcessing(true);
    setExportStatus('Quantum Script Optimization...');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Optimize the following viral script for maximum psychological impact and retention.
      Project: ${project.name}, Day: ${activeDay}.
      Persona: ${activePersona.name} (${activePersona.trait}).
      Current Trend: Mystery reveal.
      Output only the optimized script (max 20 words).`;

      const res = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt
      });

      setStrategistResponse(`OPTIMIZED SCRIPT:\n"${res.text}"`);
      setShowStrategist(true);
    } catch (err) {
      setError("Quantum optimization failed.");
    } finally {
      setIsProcessing(false);
      setExportStatus('');
    }
  };

  const runStrategist = async () => {
    if (!strategistQuery.trim()) return;
    setIsThinking(true);
    const sanitizedQuery = sanitizeInput(strategistQuery);
    setStrategistResponse(null);
    setGroundingSources([]);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const model = isElite ? 'gemini-3-pro-preview' : 'gemini-2.5-flash-lite-latest';
      const config: any = isElite ? { 
        thinkingConfig: { thinkingBudget: 32768 },
        tools: [{ googleSearch: {} }] 
      } : {};
      
      const response = await ai.models.generateContent({
        model,
        contents: `CONTEXT: Project ${project.name}, Day ${activeDay}, Mode: ${project.revealMode}, Persona: ${activePersona.name} (${activePersona.trait}). 
        Records: ${JSON.stringify(records)}.
        USER QUERY: ${sanitizedQuery}.
        STRICT: Act as the assigned viral strategist persona. ${isElite ? 'Use Google Search for real-time viral trends.' : ''} Keep it concise, elite, and stay in character.`,
        config
      });

      setStrategistResponse(response.text);
      if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        setGroundingSources(response.candidates[0].groundingMetadata.groundingChunks);
      }
    } catch (err) {
      setError("AI Strategist link failed.");
    } finally {
      setIsThinking(false);
    }
  };

  const handleUpdateSetting = (updates: Partial<Project>) => {
    setIsSyncing(true);
    onUpdateProject({ ...project, ...updates });
    setTimeout(() => setIsSyncing(false), 1000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => handleUpdateSetting({ baseImage: ev.target?.result as string });
      reader.readAsDataURL(file);
    }
  };

  const exportVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isProcessing) return;

    setIsProcessing(true);
    setExportStatus('AI Writing Script...');
    setGeneratedVideoUrl(null);

    const previousTotal = records.filter(r => r.dayNumber < activeDay).reduce((acc, r) => acc + r.followerCount, 0);
    const endVal = project.revealMode === 'DELTA' ? (previousTotal + currentFollowers) : currentFollowers;
    const currentPixels = Math.floor(endVal * project.pixelsPerFollower);

    let audioBuffer: AudioBuffer | null = null;
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const scriptPrompt = isElite 
        ? `Write a dialogue between two personas (Ava and Leo) for a Day ${activeDay} reveal. 
           Stats: ${endVal.toLocaleString()} followers.
           Leo is hype, Ava is analytical.
           They must mention "we are not close yet".
           Max 25 words total.`
        : `Write a viral reveal script for Day ${activeDay}.
           Status: ${endVal.toLocaleString()} followers, ${currentPixels.toLocaleString()} pixels revealed.
           Narrator Persona: ${activePersona.name}. 
           Required Catchphrases: "we are not close yet" and "follow for tomorrow".
           Max 22 words. Output script only.`;

      const scriptResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: scriptPrompt,
      });

      const script = scriptResponse.text?.trim() || `Day ${activeDay}. We hit ${endVal.toLocaleString()} followers. We are not close yet. Follow for tomorrow!`;

      setExportStatus(isElite ? 'Neural Multi-Speaker Synthesis...' : `Synthesizing ${activePersona.name}...`);

      const ttsConfig: any = isElite ? {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              { speaker: 'Ava', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
              { speaker: 'Leo', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
            ]
          }
        }
      } : {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: activePersona.voiceId } },
        }
      };

      const ttsResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: isElite ? `TTS the following conversation: ${script}` : script }] }],
        config: ttsConfig,
      });

      const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const decoded = decodeBase64(base64Audio);
        audioBuffer = await pcmToAudioBuffer(decoded, audioCtx);
      }
    } catch (err) {
      console.error("Narration pipeline failed:", err);
      setExportStatus('Synthesizing (Fallback)...');
    }

    setExportStatus('Rendering High Fidelity...');
    const types = ['video/mp4;codecs=h264', 'video/webm;codecs=vp9', 'video/webm'];
    const supportedType = types.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';
    const canvasStream = canvas.captureStream(30);
    const audioDest = audioCtx.createMediaStreamDestination();
    const combinedStream = new MediaStream([...canvasStream.getVideoTracks(), ...audioDest.stream.getAudioTracks()]);
    const recorder = new MediaRecorder(combinedStream, { mimeType: supportedType, videoBitsPerSecond: isElite ? 18000000 : 12000000 });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: supportedType });
      const url = URL.createObjectURL(blob);
      setGeneratedVideoUrl(url);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project.name}-day-${activeDay}.mp4`;
      link.click();
      
      setIsProcessing(false);
      setExportStatus('');
      audioCtx.close();
    };

    recorder.start();
    if (audioBuffer) {
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioDest);
      source.start(audioCtx.currentTime + 0.5);
    }

    const ctx = canvas.getContext('2d', { alpha: false })!;
    const totalDuration = 10000; 
    const startTimestamp = performance.now();
    const prevDayRec = records.find(r => r.dayNumber === activeDay - 1);
    
    let startVal = 0;
    if (project.revealMode === 'DELTA') {
        startVal = previousTotal;
    } else {
        startVal = prevDayRec ? prevDayRec.followerCount : 0;
    }

    const animate = (time: number) => {
      const elapsed = time - startTimestamp;
      const tickProgress = Math.min(elapsed / 1000, 1.0);
      const easedTick = 1 - Math.pow(1 - tickProgress, 4); 
      const currentVal = startVal + (endVal - startVal) * easedTick;
      const zoom = 1.0 + (Math.min(elapsed / totalDuration, 1.0) * (isElite ? 0.2 : 0.12));
      
      drawFrame(ctx, currentVal, activeDay, zoom, elapsed);
      
      if (elapsed < totalDuration) {
        const progress = Math.round((elapsed / totalDuration) * 100);
        setExportStatus(`Exporting ${progress}%`);
        requestAnimationFrame(animate);
      } else {
        recorder.stop();
      }
    };
    requestAnimationFrame(animate);
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setVideoProgress(progress);
      setVideoCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const time = (parseFloat(e.target.value) / 100) * videoRef.current.duration;
      videoRef.current.currentTime = time;
      setVideoProgress(parseFloat(e.target.value));
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoIsPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setVideoIsPlaying(!videoIsPlaying);
      handleMouseMove();
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVideoVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      videoRef.current.muted = vol === 0;
      setIsMuted(vol === 0);
    }
  };

  const toggleFullScreen = () => {
    if (playerContainerRef.current) {
      if (!document.fullscreenElement) {
        playerContainerRef.current.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div className={`flex flex-col lg:flex-row h-screen overflow-hidden font-['Plus_Jakarta_Sans'] ${isElite ? 'bg-[#030712] text-white' : 'bg-white text-black'}`}>
      <div className={`w-full lg:w-[450px] lg:border-r flex flex-col z-20 overflow-y-auto lg:overflow-hidden ll-reveal h-auto lg:h-full ${isElite ? 'border-indigo-500/20 bg-[#030712]' : 'border-[#f0f0f0] bg-white'}`}>
        <div className={`p-6 lg:p-10 border-b flex items-center justify-between sticky top-0 backdrop-blur-xl z-30 ${isElite ? 'border-indigo-500/20 bg-[#030712]/90' : 'border-[#f0f0f0] bg-white/90'}`}>
          <div className="flex items-center gap-3">
            <button onClick={onBack} className={`p-2 rounded-xl transition-all ${isElite ? 'hover:bg-indigo-500/10' : 'hover:bg-zinc-50'}`}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <h2 className="font-extrabold text-lg lg:text-xl tracking-tighter truncate max-w-[180px]">{project.name}</h2>
              {isElite && <span className="text-[7px] font-bold uppercase tracking-[0.3em] text-indigo-400">Premium Synthesis Active</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 lg:gap-4">
            {isElite && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest">Secure</span>
              </div>
            )}
            <button 
              onClick={() => { setShowStrategist(!showStrategist); setShowHistory(false); setShowSettings(false); }} 
              className={`p-2 rounded-xl transition-all ${showStrategist ? (isElite ? 'bg-indigo-500 text-white' : 'bg-black text-white') : 'text-zinc-400'}`}
              title="AI Strategist"
            >
              <Brain className={`w-5 h-5 ${isElite && 'animate-pulse text-indigo-400'}`} />
            </button>
            <button 
              onClick={() => { setShowHistory(!showHistory); setShowSettings(false); setShowStrategist(false); }} 
              className={`p-2 rounded-xl transition-all ${showHistory ? (isElite ? 'bg-indigo-500 text-white' : 'bg-black text-white') : 'text-zinc-400'}`}
              title="History"
            >
              <History className="w-5 h-5" />
            </button>
            <button 
              onClick={() => { setShowSettings(!showSettings); setShowHistory(false); setShowStrategist(false); }} 
              className={`p-2 rounded-xl transition-all ${showSettings ? (isElite ? 'bg-indigo-500 text-white' : 'bg-black text-white') : 'text-zinc-400'}`}
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 lg:p-10 relative">
          {error && (
            <div className={`mb-6 p-4 rounded-2xl flex gap-3 text-xs font-bold uppercase tracking-wider ${isElite ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-100 text-red-500'}`}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {quickTip && (
            <div className={`mb-6 p-5 rounded-2xl flex gap-4 items-center animate-bounce shadow-2xl ${isElite ? 'bg-indigo-600 text-white' : 'bg-black text-white'}`}>
              <Zap className={`w-5 h-5 shrink-0 ${isElite ? 'text-yellow-300' : 'text-yellow-400'}`} />
              <div className="space-y-0.5">
                <span className={`text-[7px] font-bold uppercase tracking-widest ${isElite ? 'text-indigo-200' : 'text-zinc-400'}`}>Agent Insight: {activePersona.name}</span>
                <p className="text-[10px] font-bold tracking-tight">{quickTip}</p>
              </div>
              <button onClick={() => setQuickTip(null)} className="ml-auto text-[10px] opacity-40">✕</button>
            </div>
          )}

          {(!showHistory && !showSettings && !showStrategist) && (
            <div className="space-y-10 ll-reveal">
              <section className="space-y-6">
                <div className="flex justify-between items-end">
                  <h3 className={`text-[9px] font-extrabold uppercase tracking-[0.4em] ${isElite ? 'text-indigo-400' : 'text-zinc-400'}`}>
                    {isElite ? 'Quantum Injection' : 'Signal Injection'}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-widest text-zinc-300">
                    {isSyncing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" /> Syncing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className={`w-3 h-3 ${isElite ? 'text-indigo-400' : 'text-emerald-500'}`} /> Synced
                      </>
                    )}
                  </div>
                </div>
                <div className={`ll-card p-6 lg:p-8 space-y-8 ${isElite ? 'bg-indigo-500/5 border-indigo-500/20' : ''}`}>
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <label className="text-[8px] text-zinc-400 uppercase font-bold tracking-[0.2em]">Day Pointer</label>
                      <div className="flex items-center gap-3">
                        <button onClick={() => navigateToDay(Math.max(1, activeDay - 1))} className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${isElite ? 'bg-indigo-500/10 hover:bg-indigo-500/20' : 'bg-zinc-50 hover:bg-zinc-100'}`}>-</button>
                        <span className="font-mono font-bold text-xl w-10 text-center">{activeDay}</span>
                        <button onClick={() => navigateToDay(activeDay + 1)} className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${isElite ? 'bg-indigo-500/10 hover:bg-indigo-500/20' : 'bg-zinc-50 hover:bg-zinc-100'}`}>+</button>
                      </div>
                    </div>
                    <div className={`px-3 py-1.5 rounded-full text-[8px] font-bold uppercase tracking-[0.2em] ${isElite ? 'bg-indigo-500 text-white' : 'bg-black text-white'}`}>
                      {records.some(r => r.dayNumber === activeDay) ? 'Sequence Mod' : 'Raw Entry'}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[8px] text-zinc-400 uppercase font-bold tracking-[0.2em]">
                      {project.revealMode === 'DELTA' ? 'Delta Followers' : 'Static Total'}
                    </label>
                    <input 
                      type="number"
                      value={currentFollowers}
                      onChange={(e) => setCurrentFollowers(parseInt(e.target.value) || 0)}
                      className={`w-full border rounded-[18px] p-5 text-2xl font-mono focus:outline-none transition-all ${isElite ? 'bg-[#111827] border-indigo-500/20 text-indigo-300' : 'bg-[#f8f8f8] border-[#f0f0f0]'}`}
                    />
                  </div>

                  <button 
                    onClick={handleSaveDay}
                    className={`w-full py-5 rounded-2xl font-bold transition-all active:scale-95 shadow-lg ${isElite ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20' : 'bg-black hover:bg-zinc-800 shadow-black/5'}`}
                  >
                    Commit {isElite ? 'Quantum' : 'Signal'}
                  </button>
                </div>
              </section>
            </div>
          )}

          {showStrategist && (
            <div className="space-y-8 ll-reveal h-full flex flex-col">
              <div className="flex justify-between items-end">
                <h3 className={`text-[9px] font-extrabold uppercase tracking-[0.4em] ${isElite ? 'text-indigo-400' : 'text-zinc-400'}`}>
                  AI Strategist: {activePersona.name}
                </h3>
                {isElite && (
                  <div className="bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded flex items-center gap-1.5 text-[7px] font-bold uppercase tracking-widest">
                    <Globe className="w-2.5 h-2.5" /> Web Grounding
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2">
                <div className={`rounded-[32px] p-8 space-y-4 ${isElite ? 'bg-indigo-500/5 border border-indigo-500/10' : 'bg-zinc-50'}`}>
                   <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-zinc-400">Agent Output</span>
                   {isThinking ? (
                     <div className="flex flex-col items-center gap-4 py-10 opacity-40">
                       <Loader2 className={`w-6 h-6 animate-spin ${isElite ? 'text-indigo-400' : ''}`} />
                       <span className="text-[9px] font-bold uppercase tracking-widest">{isElite ? 'Querying Neural Web...' : 'Processing...'}</span>
                     </div>
                   ) : strategistResponse ? (
                     <div className="space-y-6">
                        <div className={`text-sm font-medium leading-relaxed prose prose-invert max-w-none ${isElite ? 'text-indigo-100' : ''}`}>
                          {strategistResponse}
                        </div>
                        {groundingSources.length > 0 && (
                          <div className="pt-4 border-t border-indigo-500/10">
                            <span className="text-[8px] font-bold uppercase tracking-widest text-indigo-400 block mb-2">Verified Sources</span>
                            <div className="flex flex-wrap gap-2">
                              {groundingSources.map((chunk, i) => chunk.web && (
                                <a key={i} href={chunk.web.uri} target="_blank" rel="noopener" className="text-[7px] bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded hover:bg-indigo-500/20 transition-all border border-indigo-500/10">
                                  {chunk.web.title || 'Source'}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                     </div>
                   ) : (
                     <p className="text-zinc-400 text-xs italic">Consult with {activePersona.name}. {isElite ? 'Real-time web trends enabled.' : ''}</p>
                   )}
                </div>
              </div>

              <div className="mt-auto space-y-4 pb-10">
                <div className="relative">
                  <textarea 
                    value={strategistQuery}
                    onChange={(e) => setStrategistQuery(e.target.value)}
                    placeholder={isElite ? "Analyze current TikTok mystery trends for Day 5..." : `Ask ${activePersona.name} for advice...`}
                    className={`w-full border rounded-[24px] p-5 text-sm font-medium focus:outline-none min-h-[120px] resize-none ${isElite ? 'bg-[#111827] border-indigo-500/20 text-indigo-200 focus:border-indigo-500/40' : 'bg-[#f8f8f8] border-[#f0f0f0]'}`}
                  />
                  <button 
                    disabled={isThinking || !strategistQuery.trim()}
                    onClick={runStrategist}
                    className={`absolute bottom-4 right-4 p-3 rounded-2xl transition-all active:scale-90 disabled:opacity-20 ${isElite ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-500/20' : 'bg-black text-white hover:bg-zinc-800'}`}
                  >
                    {isElite ? <Globe className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showSettings && (
            <div className="space-y-10 ll-reveal">
              <div className="flex justify-between items-end">
                <h3 className={`text-[9px] font-extrabold uppercase tracking-[0.4em] ${isElite ? 'text-indigo-400' : 'text-zinc-400'}`}>Project Integrity</h3>
                <span className={`text-[7px] font-bold uppercase tracking-widest flex items-center gap-1 ${isElite ? 'text-indigo-400' : 'text-green-500'}`}>
                  <div className={`w-1 h-1 rounded-full animate-pulse ${isElite ? 'bg-indigo-400' : 'bg-green-500'}`} /> Locally Synced
                </span>
              </div>
              
              <div className="space-y-8">
                <div className="space-y-4">
                  <label className="text-[8px] text-zinc-400 uppercase font-bold tracking-[0.2em]">Project Alias</label>
                  <input 
                    type="text"
                    value={project.name}
                    onChange={(e) => handleUpdateSetting({ name: e.target.value })}
                    className={`w-full border rounded-[18px] p-5 font-bold tracking-tight focus:outline-none ${isElite ? 'bg-[#111827] border-indigo-500/20 text-indigo-200' : 'bg-[#f8f8f8] border-[#f0f0f0]'}`}
                  />
                </div>

                {isElite && (
                   <div className="p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-[24px] space-y-4">
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-indigo-400" />
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400">Elite Modules Unlocked</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex flex-col gap-1">
                          <span className="text-[7px] font-bold uppercase text-zinc-500 tracking-widest">Narration</span>
                          <span className="text-[8px] font-bold text-indigo-200">Dual-Speaker Mode</span>
                        </div>
                        <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex flex-col gap-1">
                          <span className="text-[7px] font-bold uppercase text-zinc-500 tracking-widest">Reasoning</span>
                          <span className="text-[8px] font-bold text-indigo-200">32K Think Budget</span>
                        </div>
                      </div>
                      <button
                        onClick={quantumOptimizeScript}
                        className="w-full py-3 bg-indigo-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-400 transition-all flex items-center justify-center gap-2"
                      >
                        <Zap className="w-3 h-3" /> Quantum Script Optimizer
                      </button>
                   </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className={`p-6 lg:p-10 border-t space-y-4 pb-safe ${isElite ? 'border-indigo-500/20 bg-[#030712]' : 'border-[#f0f0f0] bg-white'}`}>
          <button 
            disabled={isProcessing || isLoading}
            onClick={exportVideo}
            className={`w-full py-5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-30 active:scale-[0.98] shadow-xl ${isElite ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20' : 'bg-black text-white hover:bg-zinc-800'}`}
          >
            {isProcessing ? (
               <div className="flex items-center gap-3">
                 <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                 <span className="text-[10px] tracking-widest uppercase">{exportStatus}</span>
               </div>
            ) : (
              <>
                <Video className="w-4 h-4" />
                {isElite ? 'Premium AI Render' : 'Generate AI Reveal'}
              </>
            )}
          </button>
          <div className="flex items-center justify-center gap-4 text-[8px] font-bold uppercase tracking-[0.3em] text-zinc-400">
            {isElite ? <Globe className="w-3 h-3 text-indigo-400" /> : <Sparkles className="w-3 h-3" />} 
            {isElite ? 'Elite Multimodal Pipeline' : 'Gemini Multi-Modality Export'}
          </div>
        </div>
      </div>

      <div className={`flex-1 flex flex-col items-center justify-center p-4 lg:p-20 relative overflow-hidden h-full ${isElite ? 'bg-[#030712]' : 'bg-zinc-50/50'}`}>
        <div className={`absolute inset-0 opacity-[0.03] pointer-events-none ${isElite ? 'opacity-[0.05]' : ''}`} style={{ backgroundImage: `radial-gradient(${isElite ? '#818CF8' : '#000000'} 1.5px, transparent 1.5px)`, backgroundSize: '40px 40px' }} />
        
        <div 
          ref={playerContainerRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsControlsVisible(true)}
          className={`relative shadow-[0_40px_100px_rgba(0,0,0,0.08)] rounded-[24px] lg:rounded-[40px] overflow-hidden border aspect-[9/16] h-[75%] lg:h-full lg:max-h-[85vh] ll-reveal flex items-center justify-center group ${isElite ? 'border-indigo-500/30 bg-black shadow-indigo-500/10' : 'border-[#f0f0f0] bg-white'}`}
        >
          {!generatedVideoUrl ? (
            <canvas ref={canvasRef} width={1080} height={1920} className="h-full w-auto object-contain block" />
          ) : (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <video 
                ref={videoRef}
                src={generatedVideoUrl}
                className="h-full w-auto object-contain cursor-pointer"
                onTimeUpdate={handleVideoTimeUpdate}
                onLoadedMetadata={(e) => setVideoDuration((e.target as HTMLVideoElement).duration)}
                onPlay={() => { setVideoIsPlaying(true); handleMouseMove(); }}
                onPause={() => setVideoIsPlaying(false)}
                onEnded={() => setVideoIsPlaying(false)}
                onClick={togglePlay}
              />
              
              <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-6 lg:p-10 space-y-5 transition-opacity duration-500 ${isControlsVisible ? 'opacity-100' : 'opacity-0'}`}>
                 
                 <div className="flex items-center justify-between text-white font-mono text-[10px] tracking-widest font-bold">
                    <span>{formatTime(videoCurrentTime)}</span>
                    <span>{formatTime(videoDuration)}</span>
                 </div>

                 <div className="relative w-full h-1.5 bg-white/10 rounded-full group cursor-pointer overflow-visible">
                    <div 
                      className={`absolute h-full rounded-full transition-all duration-100 relative z-10 ${isElite ? 'bg-indigo-400' : 'bg-white'}`} 
                      style={{ width: `${videoProgress}%` }}
                    >
                      <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform ${isElite ? 'bg-indigo-300' : 'bg-white'}`} />
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      step="0.1"
                      value={videoProgress}
                      onChange={handleSeek}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    />
                 </div>

                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-8">
                      <button onClick={togglePlay} className="text-white hover:scale-110 transition-transform">
                        {videoIsPlaying ? <Pause className="w-7 h-7 fill-white" /> : <Play className="w-7 h-7 fill-white" />}
                      </button>
                      
                      <div className="flex items-center gap-4 group/vol">
                        <button onClick={toggleMute} className="text-white hover:text-white/80 transition-colors">
                          {isMuted || videoVolume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                        <input 
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={isMuted ? 0 : videoVolume}
                          onChange={handleVolumeChange}
                          className="w-0 group-hover/vol:w-24 transition-all duration-300 h-1 bg-white/20 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
                        />
                      </div>
                   </div>

                   <div className="flex items-center gap-6">
                    <button 
                      onClick={toggleFullScreen}
                      className="text-white/60 hover:text-white transition-colors"
                    >
                      <Maximize className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setGeneratedVideoUrl(null)}
                      className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors border border-white/10 px-4 py-2 rounded-xl"
                    >
                      <X className="w-3.5 h-3.5" /> Close
                    </button>
                   </div>
                 </div>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className={`absolute inset-0 backdrop-blur-md flex items-center justify-center flex-col gap-6 z-10 p-10 text-center ${isElite ? 'bg-[#030712]/90' : 'bg-white/90'}`}>
              <div className={`w-12 h-12 border-2 rounded-full animate-spin ${isElite ? 'border-indigo-500/20 border-t-indigo-500' : 'border-zinc-100 border-t-black'}`} />
              <div className="space-y-2">
                <span className={`text-2xl font-extrabold tracking-tighter block ${isElite ? 'text-indigo-100' : ''}`}>
                  {isElite ? 'Quantum Rendering' : 'Synthesizing Signal'}
                </span>
                <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-[0.5em]">{exportStatus}</span>
              </div>
            </div>
          )}
        </div>

        <div className={`hidden lg:flex absolute bottom-10 items-center gap-6 backdrop-blur-2xl px-10 py-5 rounded-full border shadow-xl ll-reveal ${isElite ? 'bg-indigo-600/10 border-indigo-500/20 shadow-indigo-500/10' : 'bg-white/80 border-[#f0f0f0]'}`}>
           <span className={`text-[10px] font-extrabold uppercase tracking-[0.3em] ${isElite ? 'text-indigo-400' : ''}`}>llumina Signal 2026</span>
           <div className={`w-[1px] h-4 ${isElite ? 'bg-indigo-500/20' : 'bg-zinc-200'}`} />
           <button onClick={exportVideo} className={`flex items-center gap-2 text-sm font-bold transition-all ${isElite ? 'text-indigo-200 hover:text-white' : 'hover:opacity-60'}`}>
              <Play className={`w-4 h-4 ${isElite ? 'fill-indigo-400' : 'fill-black'}`} /> 
              {isElite ? 'Quantum Loop Synthesis' : 'Generate High Fidelity Loop'}
           </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;