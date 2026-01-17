
/**
 * Simple seeded random number generator (Mulberry32)
 */
export function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates shuffle with a seed
 */
export function seededShuffle<T>(array: T[], seed: string): T[] {
  const seedNum = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random = mulberry32(seedNum);
  const shuffled = [...array];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}
