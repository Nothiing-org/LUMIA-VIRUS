
export type RevealMode = 'TOTAL' | 'DELTA';
export type TTSVoice = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';

export interface Project {
  id: string;
  userId?: string; 
  name: string;
  targetPlatform: 'TikTok' | 'Instagram' | 'Shorts';
  resolution: { width: number; height: number };
  baseImage: string; 
  maskColor: string;
  seed: string;
  pixelsPerFollower: number;
  revealMode: RevealMode;
  voiceName: TTSVoice;
  voiceSpeed?: number; // Pro: 0.5 to 2.0
  voicePitch?: number; // Pro: -20 to 20
  // Fix: manualScript is used for narrator overrides in the Dashboard component
  manualScript?: string;
  createdAt: number;
  isPro?: boolean;
}

export interface DayRecord {
  id: string;
  userId?: string;
  projectId: string;
  dayNumber: number;
  followerCount: number;
  timestamp: number;
}

export interface UserProfile {
  uid: string;
  isPro: boolean;
  updatedAt: number;
}

export interface Persona {
  id: TTSVoice;
  name: string;
  desc: string;
  trait: string;
}
