export type RevealMode = 'TOTAL' | 'DELTA';
export type TTSVoice = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';

export interface Persona {
  id: string;
  name: string;
  voiceId: TTSVoice;
  trait: string;
  desc: string;
  energy: 'LOW' | 'MEDIUM' | 'HIGH';
  pacing: 'SLOW' | 'STEADY' | 'FAST';
}

export interface Project {
  id: string;
  name: string;
  targetPlatform: 'TikTok' | 'Instagram' | 'Shorts';
  resolution: { width: number; height: number };
  baseImage: string; // Data URL
  maskColor: string;
  seed: string;
  pixelsPerFollower: number;
  revealMode: RevealMode;
  personaId: string;
  createdAt: number;
  isPro?: boolean;
}

export interface DayRecord {
  id: string;
  projectId: string;
  dayNumber: number;
  followerCount: number;
  timestamp: number;
}

export interface RenderState {
  currentPixels: number;
  totalPixels: number;
  percentage: number;
}