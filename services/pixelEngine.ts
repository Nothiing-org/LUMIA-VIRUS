
import { mulberry32 } from '../utils/random';

export class PixelEngine {
  private shuffledIndices: Uint32Array | null = null;
  private width: number;
  private height: number;
  private seed: string;
  private currentMaskImageData: ImageData | null = null;
  private lastRevealedCount: number = 0;

  constructor(width: number, height: number, seed: string) {
    this.width = width;
    this.height = height;
    this.seed = seed;
  }

  /**
   * Precomputes the shuffled array of pixel indices using TypedArrays
   */
  async initialize() {
    const totalPixels = this.width * this.height;
    const indices = new Uint32Array(totalPixels);
    for (let i = 0; i < totalPixels; i++) {
      indices[i] = i;
    }

    // Seeded Fisher-Yates in-place shuffle
    const seedNum = Array.from(this.seed).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const random = mulberry32(seedNum);
    
    for (let i = totalPixels - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      const temp = indices[i];
      indices[i] = indices[j];
      indices[j] = temp;
    }

    this.shuffledIndices = indices;
    this.resetMask();
  }

  /**
   * Resets the internal mask state
   */
  resetMask() {
    this.currentMaskImageData = null;
    this.lastRevealedCount = 0;
  }

  /**
   * Generates a mask ImageData where the first N shuffled pixels are transparent.
   * Uses incremental updates to maintain 60fps even at high resolutions.
   */
  generateMask(pixelsToReveal: number, maskColor: string): ImageData {
    const totalPixels = this.width * this.height;
    const targetReveal = Math.max(0, Math.min(Math.floor(pixelsToReveal), totalPixels));

    // Parse mask color
    const r = parseInt(maskColor.slice(1, 3), 16);
    const g = parseInt(maskColor.slice(3, 5), 16);
    const b = parseInt(maskColor.slice(5, 7), 16);

    // Initialize if needed
    if (!this.currentMaskImageData) {
      this.currentMaskImageData = new ImageData(this.width, this.height);
      const data = this.currentMaskImageData.data;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 255;
      }
      this.lastRevealedCount = 0;
    }

    const data = this.currentMaskImageData.data;

    // Handle "un-reveal" (if follower count decreases)
    if (targetReveal < this.lastRevealedCount) {
      if (this.shuffledIndices) {
        for (let i = targetReveal; i < this.lastRevealedCount; i++) {
          const pixelIdx = this.shuffledIndices[i];
          const dataIdx = pixelIdx * 4;
          data[dataIdx + 3] = 255; // Opaque
        }
      }
    } 
    // Handle "reveal" (normal progress)
    else if (targetReveal > this.lastRevealedCount) {
      if (this.shuffledIndices) {
        for (let i = this.lastRevealedCount; i < targetReveal; i++) {
          const pixelIdx = this.shuffledIndices[i];
          const dataIdx = pixelIdx * 4;
          data[dataIdx + 3] = 0; // Transparent
        }
      }
    }

    this.lastRevealedCount = targetReveal;
    return this.currentMaskImageData;
  }
}
