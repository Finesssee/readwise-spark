/**
 * Image Processing Utilities
 * Browser-compatible image processing using Canvas API and compression libraries
 */

import imageCompression from 'browser-image-compression';
import { measurePerformance } from './performanceMonitoring';

/**
 * Options for image processing
 */
export interface ImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  maxSizeMB?: number;
  grayscale?: boolean;
  blur?: number;
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  rotate?: number; // degrees
  flip?: 'horizontal' | 'vertical' | 'both';
}

/**
 * Metadata extracted from an image
 */
export interface ImageMetadata {
  width: number;
  height: number;
  format?: string;
  size?: number;
  aspectRatio: number;
  createdAt?: Date;
  modifiedAt?: Date;
  exif?: Record<string, any>;
}

/**
 * Load an image from a file or URL
 */
export async function loadImage(source: File | string): Promise<HTMLImageElement> {
  return measurePerformance('imageUtils:loadImage', async () => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      
      if (typeof source === 'string') {
        // Load from URL
        img.src = source;
      } else {
        // Load from File
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            img.src = e.target.result as string;
          } else {
            reject(new Error('Failed to read image file'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(source);
      }
    });
  });
}

/**
 * Process an image with specified options
 */
export async function processImage(
  source: File | HTMLImageElement | string,
  options: ImageProcessingOptions = {}
): Promise<Blob> {
  return measurePerformance('imageUtils:processImage', async () => {
    try {
      // Load image if not already loaded
      const img = source instanceof HTMLImageElement
        ? source
        : await loadImage(source);
      
      // Create canvas for image processing
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }
      
      // Set canvas dimensions (with resize if specified)
      const originalWidth = img.width;
      const originalHeight = img.height;
      let width = options.width || originalWidth;
      let height = options.height || originalHeight;
      
      // Maintain aspect ratio if only one dimension is specified
      if (options.width && !options.height) {
        height = Math.round(originalHeight * (width / originalWidth));
      } else if (!options.width && options.height) {
        width = Math.round(originalWidth * (height / originalHeight));
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Apply crop if specified
      if (options.crop) {
        const { x, y, width: cropWidth, height: cropHeight } = options.crop;
        ctx.drawImage(
          img,
          x, y, cropWidth, cropHeight,
          0, 0, width, height
        );
      } else {
        // Draw the image with resize
        ctx.drawImage(img, 0, 0, width, height);
      }
      
      // Apply rotation if specified
      if (options.rotate) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        if (!tempCtx) {
          throw new Error('Failed to get temporary canvas context');
        }
        
        // Adjust canvas size for rotation
        if (options.rotate === 90 || options.rotate === 270) {
          tempCanvas.width = height;
          tempCanvas.height = width;
        } else {
          tempCanvas.width = width;
          tempCanvas.height = height;
        }
        
        // Rotate the image
        tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
        tempCtx.rotate((options.rotate * Math.PI) / 180);
        tempCtx.drawImage(canvas, -width / 2, -height / 2);
        
        // Replace original canvas with rotated canvas
        canvas.width = tempCanvas.width;
        canvas.height = tempCanvas.height;
        ctx.drawImage(tempCanvas, 0, 0);
      }
      
      // Apply flip if specified
      if (options.flip) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        if (!tempCtx) {
          throw new Error('Failed to get temporary canvas context');
        }
        
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        
        if (options.flip === 'horizontal' || options.flip === 'both') {
          tempCtx.translate(tempCanvas.width, 0);
          tempCtx.scale(-1, 1);
        }
        
        if (options.flip === 'vertical' || options.flip === 'both') {
          tempCtx.translate(0, tempCanvas.height);
          tempCtx.scale(1, -1);
        }
        
        tempCtx.drawImage(canvas, 0, 0);
        
        // Replace original canvas with flipped canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(tempCanvas, 0, 0);
      }
      
      // Apply grayscale if specified
      if (options.grayscale) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          const brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
          data[i] = brightness;
          data[i + 1] = brightness;
          data[i + 2] = brightness;
        }
        
        ctx.putImageData(imageData, 0, 0);
      }
      
      // Apply blur if specified
      if (options.blur && options.blur > 0) {
        // Simple box blur implementation
        for (let i = 0; i < options.blur; i++) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          
          if (!tempCtx) {
            throw new Error('Failed to get temporary canvas context');
          }
          
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          tempCtx.putImageData(imageData, 0, 0);
          
          ctx.filter = 'blur(1px)';
          ctx.drawImage(tempCanvas, 0, 0);
          ctx.filter = 'none';
        }
      }
      
      // Convert to the specified format
      const format = options.format || 'jpeg';
      const quality = options.quality !== undefined ? options.quality / 100 : 0.9;
      const mimeType = `image/${format}`;
      
      // Use browser-image-compression for optimization if maxSizeMB is specified
      if (options.maxSizeMB) {
        // Convert canvas to file first
        return new Promise((resolve, reject) => {
          canvas.toBlob(async (blob) => {
            if (!blob) {
              reject(new Error('Failed to convert canvas to blob'));
              return;
            }
            
            try {
              // Use image compression library to optimize the image
              const file = new File([blob], 'image.' + format, { type: mimeType });
              const compressedFile = await imageCompression(file, {
                maxSizeMB: options.maxSizeMB,
                maxWidthOrHeight: Math.max(width, height),
                useWebWorker: true,
                initialQuality: quality
              });
              
              resolve(compressedFile);
            } catch (error) {
              reject(error);
            }
          }, mimeType, quality);
        });
      } else {
        // Return canvas blob directly if no compression is needed
        return new Promise((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to convert canvas to blob'));
            }
          }, mimeType, quality);
        });
      }
    } catch (error) {
      console.error('Error processing image:', error);
      throw error;
    }
  });
}

/**
 * Resize an image to the specified dimensions
 */
export async function resizeImage(
  source: File | HTMLImageElement | string,
  width: number,
  height?: number,
  options: Omit<ImageProcessingOptions, 'width' | 'height'> = {}
): Promise<Blob> {
  return processImage(source, {
    ...options,
    width,
    height
  });
}

/**
 * Compress an image to reduce its file size
 */
export async function compressImage(
  source: File | HTMLImageElement | string,
  maxSizeMB: number,
  options: Omit<ImageProcessingOptions, 'maxSizeMB'> = {}
): Promise<Blob> {
  return processImage(source, {
    ...options,
    maxSizeMB
  });
}

/**
 * Convert an image to a different format
 */
export async function convertImageFormat(
  source: File | HTMLImageElement | string,
  format: 'jpeg' | 'png' | 'webp',
  quality = 90,
  options: Omit<ImageProcessingOptions, 'format' | 'quality'> = {}
): Promise<Blob> {
  return processImage(source, {
    ...options,
    format,
    quality
  });
}

/**
 * Crop an image to the specified rectangle
 */
export async function cropImage(
  source: File | HTMLImageElement | string,
  crop: { x: number; y: number; width: number; height: number },
  options: Omit<ImageProcessingOptions, 'crop'> = {}
): Promise<Blob> {
  return processImage(source, {
    ...options,
    crop
  });
}

/**
 * Apply a grayscale filter to an image
 */
export async function grayscaleImage(
  source: File | HTMLImageElement | string,
  options: Omit<ImageProcessingOptions, 'grayscale'> = {}
): Promise<Blob> {
  return processImage(source, {
    ...options,
    grayscale: true
  });
}

/**
 * Apply a blur filter to an image
 */
export async function blurImage(
  source: File | HTMLImageElement | string,
  blurAmount: number,
  options: Omit<ImageProcessingOptions, 'blur'> = {}
): Promise<Blob> {
  return processImage(source, {
    ...options,
    blur: blurAmount
  });
}

/**
 * Extract metadata from an image
 */
export async function getImageMetadata(source: File | HTMLImageElement | string): Promise<ImageMetadata> {
  return measurePerformance('imageUtils:getMetadata', async () => {
    try {
      // Load image if not already loaded
      const img = source instanceof HTMLImageElement
        ? source
        : await loadImage(source);
      
      // Basic metadata
      const metadata: ImageMetadata = {
        width: img.width,
        height: img.height,
        aspectRatio: img.width / img.height,
      };
      
      // If source is a file, add more metadata
      if (source instanceof File) {
        metadata.size = source.size;
        metadata.format = source.type.split('/')[1];
        metadata.modifiedAt = new Date(source.lastModified);
      }
      
      return metadata;
    } catch (error) {
      console.error('Error getting image metadata:', error);
      throw error;
    }
  });
}

/**
 * Create an image thumbnail
 */
export async function createThumbnail(
  source: File | HTMLImageElement | string,
  maxWidth = 200,
  maxHeight = 200,
  format: 'jpeg' | 'png' | 'webp' = 'jpeg',
  quality = 80
): Promise<Blob> {
  return measurePerformance('imageUtils:createThumbnail', async () => {
    // Load image if not already loaded
    const img = source instanceof HTMLImageElement
      ? source
      : await loadImage(source);
    
    // Calculate dimensions
    const originalWidth = img.width;
    const originalHeight = img.height;
    const aspectRatio = originalWidth / originalHeight;
    
    let width, height;
    if (aspectRatio > 1) {
      // Landscape image
      width = Math.min(maxWidth, originalWidth);
      height = width / aspectRatio;
    } else {
      // Portrait or square image
      height = Math.min(maxHeight, originalHeight);
      width = height * aspectRatio;
    }
    
    // Resize and return thumbnail
    return resizeImage(img, Math.round(width), Math.round(height), {
      format,
      quality
    });
  });
}

/**
 * Check if an image has alpha transparency
 */
export async function hasTransparency(source: File | HTMLImageElement | string): Promise<boolean> {
  return measurePerformance('imageUtils:hasTransparency', async () => {
    // Load image if not already loaded
    const img = source instanceof HTMLImageElement
      ? source
      : await loadImage(source);
    
    // Create canvas to analyze the image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Check for any pixel with alpha < 255
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) {
        return true;
      }
    }
    
    return false;
  });
}

/**
 * Convert an image to a base64 data URL
 */
export async function imageToDataUrl(
  source: File | HTMLImageElement | string,
  format: 'jpeg' | 'png' | 'webp' = 'jpeg',
  quality = 90
): Promise<string> {
  return measurePerformance('imageUtils:imageToDataUrl', async () => {
    // Load image if not already loaded
    const img = source instanceof HTMLImageElement
      ? source
      : await loadImage(source);
    
    // Create canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    
    // Convert to data URL
    return canvas.toDataURL(`image/${format}`, quality / 100);
  });
} 