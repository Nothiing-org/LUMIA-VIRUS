
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

  /**
   * Applies a glitch effect to the provided ImageData
   */
  applyGlitch(imageData: ImageData, intensity: number = 0.2): void {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const random = mulberry32(Date.now());

    // Horizontal slice shifting
    const numSlices = Math.floor(random() * 5 * intensity);
    for (let i = 0; i < numSlices; i++) {
      const sliceY = Math.floor(random() * height);
      const sliceHeight = Math.floor(random() * 20) + 1;
      const shift = Math.floor((random() - 0.5) * 40 * intensity);

      for (let y = sliceY; y < Math.min(sliceY + sliceHeight, height); y++) {
        const rowStart = y * width * 4;
        const rowCopy = new Uint8ClampedArray(data.subarray(rowStart, rowStart + width * 4));
        for (let x = 0; x < width; x++) {
          const targetX = (x + shift + width) % width;
          const targetIdx = rowStart + targetX * 4;
          const sourceIdx = x * 4;
          data[targetIdx] = rowCopy[sourceIdx];
          data[targetIdx + 1] = rowCopy[sourceIdx + 1];
          data[targetIdx + 2] = rowCopy[sourceIdx + 2];
          data[targetIdx + 3] = rowCopy[sourceIdx + 3];
        }
      }
    }

    // Color channel offset (Chromatic Aberration)
    if (random() < intensity) {
      const offset = Math.floor(random() * 5) + 1;
      for (let i = 0; i < data.length - offset * 4; i += 4) {
        data[i] = data[i + offset * 4]; // Red channel shift
      }
    }
  }

  /**
   * Applies a design filter (Premium look)
   */
  applyDesignFilter(imageData: ImageData, type: 'GOLDEN' | 'NEON' | 'MONO' = 'NEON'): void {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      if (type === 'GOLDEN') {
        data[i] = Math.min(255, r * 1.2);
        data[i + 1] = Math.min(255, g * 1.0);
        data[i + 2] = Math.min(255, b * 0.8);
      } else if (type === 'NEON') {
        data[i] = Math.min(255, r * 1.1);
        data[i + 1] = Math.min(255, g * 0.9);
        data[i + 2] = Math.min(255, b * 1.3);
      } else if (type === 'MONO') {
        const avg = (r + g + b) / 3;
        data[i] = avg;
        data[i + 1] = avg;
        data[i + 2] = avg;
      }
    }
  }
}
