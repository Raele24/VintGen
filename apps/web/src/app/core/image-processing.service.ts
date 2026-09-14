import { Injectable } from '@angular/core';

export interface ProcessedImageResult {
  base64: string;
  previewUrl: string;
  mimeType: string;
}

@Injectable({
  providedIn: 'root',
})
export class ImageProcessingService {
  /**
   * Performs client-side automatic lighting, contrast, and clarity enhancement
   * using HTML5 Canvas pixel manipulation.
   */
  public async enhanceLighting(
    dataUrlOrBase64: string,
    mimeType: string = 'image/jpeg'
  ): Promise<ProcessedImageResult> {
    const src = dataUrlOrBase64.startsWith('data:')
      ? dataUrlOrBase64
      : `data:${mimeType};base64,${dataUrlOrBase64}`;

    const img = await this.loadImage(src);

    // Create canvas
    const maxDim = 2400;
    let { width, height } = img;
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable');
    }

    ctx.drawImage(img, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const totalPixels = width * height;

    // Step 1: Compute luminance histogram for dynamic range expansion
    const hist = new Uint32Array(256);
    for (let i = 0; i < data.length; i += 4) {
      const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      hist[lum]++;
    }

    // Step 2: Find 1st and 99th percentiles (auto-levels / shadow-highlight clipping)
    const clipLow = Math.round(totalPixels * 0.015);
    const clipHigh = Math.round(totalPixels * 0.985);

    let count = 0;
    let minLum = 0;
    for (let i = 0; i < 256; i++) {
      count += hist[i];
      if (count >= clipLow) {
        minLum = i;
        break;
      }
    }

    count = 0;
    let maxLum = 255;
    for (let i = 255; i >= 0; i--) {
      count += hist[i];
      if (count >= totalPixels - clipHigh) {
        maxLum = i;
        break;
      }
    }

    if (maxLum <= minLum) {
      maxLum = 255;
      minLum = 0;
    }

    const range = maxLum - minLum;

    // Step 3: Apply dynamic range expansion, mid-tone gamma boost (revealing dark fabric seams),
    // and gentle vibrance boost.
    const gamma = 0.88; // Slight lift for underexposed shadows
    const lut = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      let norm = (i - minLum) / range;
      norm = Math.max(0, Math.min(1, norm));
      const adjusted = Math.pow(norm, gamma) * 255;
      lut[i] = Math.max(0, Math.min(255, Math.round(adjusted)));
    }

    // Process pixels
    for (let i = 0; i < data.length; i += 4) {
      let r = lut[data[i]];
      let g = lut[data[i + 1]];
      let b = lut[data[i + 2]];

      // Mild saturation boost (+12%) for true-to-life item colors
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const delta = max - min;
      if (delta > 0 && max > 0) {
        const factor = 1.12;
        r = Math.round(max - (max - r) * factor);
        g = Math.round(max - (max - g) * factor);
        b = Math.round(max - (max - b) * factor);
      }

      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }

    ctx.putImageData(imageData, 0, 0);

    const outMime = mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
    const outputDataUrl = canvas.toDataURL(outMime, 0.92);
    const cleanBase64 = outputDataUrl.split(',')[1] || '';

    // Create object URL from blob
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b || new Blob()), outMime, 0.92);
    });
    const previewUrl = URL.createObjectURL(blob);

    return {
      base64: cleanBase64,
      previewUrl,
      mimeType: outMime,
    };
  }

  /**
   * Client-side background removal using WebAssembly (@imgly/background-removal).
   * Lazy-loads the library on demand to prevent bundle bloat.
   */
  public async removeBackground(
    imageSource: string | Blob,
    onProgress?: (percent: number, text: string) => void
  ): Promise<ProcessedImageResult> {
    if (onProgress) onProgress(10, 'Loading background removal engine...');

    // Lazy load the WASM package
    const { removeBackground } = await import('@imgly/background-removal');

    if (onProgress) onProgress(30, 'Isolating item from background...');

    const resultBlob = await removeBackground(imageSource, {
      // Official staticimgly CDN with onnxruntime-web 1.21.0-dev — the library resolves the version automatically
      publicPath: 'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/',
      progress: (key: string, current: number, total: number) => {
        if (onProgress && total > 0) {
          const pct = Math.min(95, Math.round(30 + (current / total) * 60));
          onProgress(pct, `Processing ${key} (${pct}%)`);
        }
      },
    });

    if (onProgress) onProgress(98, 'Finalizing cutout...');

    const cleanBase64 = await this.blobToBase64(resultBlob);
    const previewUrl = URL.createObjectURL(resultBlob);

    return {
      base64: cleanBase64,
      previewUrl,
      mimeType: 'image/png',
    };
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(new Error('Failed to load image for processing: ' + e));
      img.src = src;
    });
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        const base64 = res.split(',')[1] || '';
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
