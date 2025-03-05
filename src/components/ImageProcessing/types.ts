import { ImageMetadata } from '@/utils/imageUtils';

/**
 * Image processing options interface
 */
export interface ProcessingOptions {
  width: number;
  height: number;
  quality: number;
  format: 'jpeg' | 'png' | 'webp';
  maxSizeMB: number;
  grayscale: boolean;
  blur: number;
  crop: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}

/**
 * Processing result interface
 */
export interface ProcessingResult {
  id: string;
  name: string;
  originalUrl: string;
  processedUrl: string;
  originalSize: number;
  processedSize: number;
  processingTime: number;
  method: 'client' | 'server' | 'wasm';
  options: Partial<ProcessingOptions>;
  metadata?: ImageMetadata;
} 