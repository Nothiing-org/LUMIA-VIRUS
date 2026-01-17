
import React, { useState } from 'react';
import { auth, googleProvider } from '../services/firebase';
import { 
  signInWithPopup, 
  signInAnonymously, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import { ShieldCheck, Loader2, Globe, Mail, UserCircle2, Key, ArrowRight } from 'lucide-react';

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<'GOOGLE' | 'EMAIL' | 'GUEST'>('GOOGLE');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError(err.message || "Google auth failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      setError(err.message || "Guest link failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-6 font-['Plus_Jakarta_Sans'] overflow-hidden relative">
      {/* Minimalist Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <div className="max-w-md w-full space-y-12 text-center ll-reveal relative z-10">
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-2.5 h-2.5 bg-black rounded-full" />
            <span className="text-xl font-extrabold tracking-tighter uppercase">llumina</span>
          </div>
          <h1 className="text-6xl font-extrabold tracking-tighter leading-[0.85] text-black">
            SIGNAL <br /> SYNTHESIS
          </h1>
          <p className="text-zinc-400 text-[9px] font-bold uppercase tracking-[0.4em] py-2">
            Deterministic Progression Engine
          </p>
        </div>

        <div className="bg-white border border-zinc-100 rounded-[40px] p-8 lg:p-10 space-y-8 shadow-[0_40px_100px_rgba(0,0,0,0.04)]">
          {/* Method Tabs */}
          <div className="flex p-1 bg-zinc-50 rounded-2xl border border-zinc-100">
            {[
              { id: 'GOOGLE', icon: Globe, label: 'Google' },
              { id: 'EMAIL', icon: Mail, label: 'Email' },
              { id: 'GUEST', icon: UserCircle2, label: 'Guest' }
            ].map((method) => (
              <button
                key={method.id}
                onClick={() => setAuthMethod(method.id as any)}
                className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all ${authMethod === method.id ? 'bg-white text-black shadow-sm border border-zinc-100' : 'text-zinc-400 hover:text-black'}`}
              >
                <method.icon className="w-3.5 h-3.5" />
                <span className="text-[8px] font-bold uppercase tracking-widest">{method.label}</span>
              </button>
            ))}
          </div>

          {error && (
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-[9px] text-black font-bold uppercase tracking-widest">
              {error}
            </div>
          )}

          {authMethod === 'GOOGLE' && (
            <div className="space-y-6 ll-reveal">
              <p className="text-zinc-500 text-[10px] font-medium leading-relaxed px-4">Establish cloud synchronization via Google Identity.</p>
              <button 
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-5 bg-black text-white hover:bg-zinc-800 rounded-[20px] font-bold text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-3 uppercase tracking-widest"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <>
                    <Globe className="w-4 h-4" />
                    Connect via Google
                  </>
                )}
              </button>
            </div>
          )}

          {authMethod === 'EMAIL' && (
            <form onSubmit={handleEmailAuth} className="space-y-4 ll-reveal">
              <div className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input 
                    type="email" 
                    placeholder="EMAIL ADDRESS"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-5 pl-14 text-[10px] font-bold tracking-widest focus:outline-none focus:border-zinc-300 transition-all placeholder:text-zinc-300"
                    required
                  />
                </div>
                <div className="relative">
                  <Key className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input 
                    type="password" 
                    placeholder="PASSWORD"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-5 pl-14 text-[10px] font-bold tracking-widest focus:outline-none focus:border-zinc-300 transition-all placeholder:text-zinc-300"
                    required
                  />
                </div>
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-black text-white hover:bg-zinc-800 rounded-[20px] font-bold text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-3 uppercase tracking-widest"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <>
                    {isSignUp ? 'Initialize Profile' : 'Restore Signal'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <button 
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-[8px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 hover:text-black transition-colors"
              >
                {isSignUp ? 'Already have a signal? Sign In' : 'New to synthesis? Sign Up'}
              </button>
            </form>
          )}

          {authMethod === 'GUEST' && (
            <div className="space-y-6 ll-reveal text-center">
              <div className="p-6 bg-zinc-50 border border-zinc-100 rounded-[28px] space-y-2">
                <ShieldCheck className="w-5 h-5 text-zinc-400 mx-auto" />
                <p className="text-zinc-400 text-[9px] font-bold uppercase tracking-widest leading-relaxed">
                  Volatile Partition: <br /> Data persists in local cache only.
                </p>
              </div>
              <button 
                onClick={handleGuestLogin}
                disabled={loading}
                className="w-full py-5 border border-zinc-200 hover:bg-zinc-50 text-black rounded-[20px] font-bold text-xs transition-all active:scale-[0.98] uppercase tracking-widest"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enter as Guest'}
              </button>
            </div>
          )}

          <div className="pt-2 flex items-center justify-center gap-2 text-zinc-300">
             <ShieldCheck className="w-3 h-3" />
             <span className="text-[7px] font-extrabold uppercase tracking-[0.3em]">Identity Protocol v3.1</span>
          </div>
        </div>

        <footer className="text-[8px] font-extrabold uppercase tracking-[0.5em] text-zinc-200">
          PRO SIGNAL GATEWAY • CLOUD SECURE
        </footer>
      </div>
    </div>
  );
};

export default Login;
