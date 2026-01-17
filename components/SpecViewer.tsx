
import React from 'react';
import { Book, CheckCircle2, ShieldAlert, Cpu, Layers } from 'lucide-react';

const SpecViewer: React.FC = () => {
  return (
    <div className="max-w-4xl space-y-20 pb-24 font-['Plus_Jakarta_Sans']">
      <header className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-black rounded-full" />
          <span className="text-[10px] font-extrabold uppercase tracking-[0.4em] text-zinc-400">Documentation v1.1.0</span>
        </div>
        <h1 className="text-6xl font-extrabold tracking-tighter leading-[0.9]">llumina DNA</h1>
        <p className="text-zinc-500 text-xl font-medium">Elite intelligence for viral progression synthesis.</p>
      </header>

      <section className="space-y-8">
        <div className="flex items-center gap-4 text-[10px] font-extrabold uppercase tracking-[0.3em]">
          <Layers className="w-5 h-5 text-black" />
          <h2>Structural Framework</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white border border-[#f0f0f0] rounded-[32px] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.03)] space-y-6">
            <h3 className="text-[10px] uppercase font-extrabold text-zinc-400 tracking-[0.3em]">Project Entity</h3>
            <ul className="space-y-4 text-sm font-medium">
              <li className="flex items-center justify-between">
                <span className="text-zinc-400">Identifier</span>
                <code className="bg-zinc-50 px-2 py-1 rounded font-mono text-xs">UUID</code>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-zinc-400">Source</span>
                <code className="bg-zinc-50 px-2 py-1 rounded font-mono text-xs">9:16 DATA</code>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-zinc-400">Algorithm</span>
                <code className="bg-zinc-50 px-2 py-1 rounded font-mono text-xs">PRNG SEED</code>
              </li>
            </ul>
          </div>
          <div className="bg-white border border-[#f0f0f0] rounded-[32px] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.03)] space-y-6">
            <h3 className="text-[10px] uppercase font-extrabold text-zinc-400 tracking-[0.3em]">Metric Record</h3>
            <ul className="space-y-4 text-sm font-medium">
              <li className="flex items-center justify-between">
                <span className="text-zinc-400">Chronology</span>
                <code className="bg-zinc-50 px-2 py-1 rounded font-mono text-xs">INT SEQUENCE</code>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-zinc-400">Load</span>
                <code className="bg-zinc-50 px-2 py-1 rounded font-mono text-xs">PX/FOLLOWER</code>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <div className="flex items-center gap-4 text-[10px] font-extrabold uppercase tracking-[0.3em]">
          <Cpu className="w-5 h-5 text-black" />
          <h2>Core Intelligence</h2>
        </div>
        <div className="bg-[#f8f8f8] border border-[#f0f0f0] p-12 rounded-[32px] space-y-8">
          <div className="space-y-2">
            <h4 className="text-xl font-bold tracking-tighter uppercase">Deterministic Shuffling</h4>
            <p className="text-zinc-500 font-medium">
              Signal processing utilizes a Fisher-Yates shuffle stored in Uint32Array to preserve memory efficiency. Every pixel position is mapped to a unique sequence index, ensuring 100% reproducibility.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="text-xl font-bold tracking-tighter uppercase">Cinematic Synthesizer</h4>
            <p className="text-zinc-500 font-medium">
              The export engine generates 6s loops at 30fps with high-bitrate encoding (up to 18Mbps for Pro). Includes a 1s animated ticker for real-time progression feedback for authorized status users.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <div className="flex items-center gap-4 text-[10px] font-extrabold uppercase tracking-[0.3em]">
          <ShieldAlert className="w-5 h-5 text-black" />
          <h2>Edge Protocol</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { title: "Metric Decay", desc: "Decreased follower counts trigger deterministic un-reveal logic." },
            { title: "Edit Conflicts", desc: "Modification of historical records triggers continuity warnings." },
            { title: "Memory Saturation", desc: "4K assets are processed via memory-efficient TypedArrays." },
            { title: "Export Stability", desc: "Automated fallbacks for MP4/WebM browser compatibility." }
          ].map((item, i) => (
            <div key={i} className="flex gap-6 p-8 bg-zinc-50 rounded-[24px] items-start">
              <CheckCircle2 className="w-5 h-5 text-black mt-1" />
              <div className="space-y-1">
                <span className="font-bold tracking-tight block text-lg">{item.title}</span>
                <span className="text-zinc-500 text-sm font-medium">{item.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default SpecViewer;
