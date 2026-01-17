
import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface NotFoundProps {
  onBack: () => void;
}

const NotFound: React.FC<NotFoundProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-6 font-['Plus_Jakarta_Sans'] relative overflow-hidden">
      {/* Background Glitch Pattern */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'linear-gradient(0deg, #000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      
      <div className="max-w-md w-full text-center space-y-10 ll-reveal relative z-10">
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 mb-8 opacity-20">
            <ShieldAlert className="w-5 h-5" />
            <span className="text-[10px] font-extrabold uppercase tracking-[0.5em]">System Interrupt</span>
          </div>
          
          <h1 className="text-[120px] font-extrabold tracking-tighter leading-none text-black select-none">
            404
          </h1>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold tracking-tighter uppercase">Signal Lost</h2>
            <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-[0.3em] leading-relaxed">
              The coordinates you requested <br /> do not exist in this sector.
            </p>
          </div>
        </div>

        <div className="pt-8">
          <button 
            onClick={onBack}
            className="group relative inline-flex items-center gap-3 px-10 py-5 bg-black text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all hover:bg-zinc-800 active:scale-95 shadow-2xl shadow-black/10"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Return to Source
          </button>
        </div>

        <div className="pt-20 opacity-5">
           <span className="text-[8px] font-extrabold uppercase tracking-[1em]">llumina • dead_end_protocol</span>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
