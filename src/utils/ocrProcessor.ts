import { createWorker, RecognizeResult } from 'tesseract.js';
import { measurePerformance } from './performanceMonitoring';

// Type for worker logger messages
interface LoggerMessage {
  status: string;
  progress: number;
  [key: string]: any;
}

// OCR worker manager to reuse workers for better performance
class OCRWorkerManager {
  private worker: any = null; // Use any type to avoid compilation errors with Tesseract Worker
  private isProcessing = false;
  private queue: Array<{
    resolve: (result: RecognizeResult) => void;
    reject: (error: any) => void;
    imageData: File | Blob | HTMLImageElement | HTMLCanvasElement;
    options?: any;
  }> = [];
  private isInitialized = false;
  private language = 'eng'; // Default language
  
  // Initialize worker with specified language
  public async initialize(language = 'eng'): Promise<void> {
    if (this.isInitialized && this.language === language) {
      return;
    }
    
    // Terminate existing worker if language changes
    if (this.worker && this.language !== language) {
      await this.terminate();
    }
    
    this.language = language;
    
    if (!this.worker) {
      console.log(`[OCR] Initializing worker with language: ${language}`);
      this.worker = await createWorker({
        logger: process.env.NODE_ENV === 'development' 
          ? (m: LoggerMessage) => console.log(`[Tesseract] ${m.status}: ${m.progress * 100}%`)
          : undefined,
      });
      
      await this.worker.loadLanguage(language);
      await this.worker.initialize(language);
    }
    
    this.isInitialized = true;
    this.processQueue();
  }
  
  // Process text from image
  public async process(
    imageData: File | Blob | HTMLImageElement | HTMLCanvasElement,
    options?: any
  ): Promise<RecognizeResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    // If already processing, add to queue
    if (this.isProcessing || this.queue.length > 0) {
      return new Promise((resolve, reject) => {
        this.queue.push({ resolve, reject, imageData, options });
      });
    }
    
    return this.performOCR(imageData, options);
  }
  
  // Process queue items one by one
  private async processQueue(): Promise<void> {
    if (this.queue.length === 0 || this.isProcessing) {
      return;
    }
    
    const item = this.queue.shift();
    if (item) {
      try {
        const result = await this.performOCR(item.imageData, item.options);
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      }
      
      // Process next item in queue
      this.processQueue();
    }
  }
  
  // Perform OCR on the image data
  private async performOCR(
    imageData: File | Blob | HTMLImageElement | HTMLCanvasElement,
    options?: any
  ): Promise<RecognizeResult> {
    if (!this.worker) {
      throw new Error('OCR worker not initialized');
    }
    
    this.isProcessing = true;
    
    try {
      const result = await this.worker.recognize(imageData, options);
      return result;
    } finally {
      this.isProcessing = false;
      // Process next item if any
      setTimeout(() => this.processQueue(), 0);
    }
  }
  
  // Terminate worker to free resources
  public async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }
}

// Singleton instance
const workerManager = new OCRWorkerManager();

// Register cleanup on window unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    workerManager.terminate();
  });
}

interface ExtractTextOptions {
  language?: string;
  useProgressiveResults?: boolean;
  onProgress?: (progress: number) => void;
}

/**
 * Extract text from an image using OCR
 * @param image The image to process
 * @param options OCR options
 */
export async function extractTextFromImage(
  image: File | Blob | HTMLImageElement | HTMLCanvasElement,
  options: ExtractTextOptions = {}
): Promise<string> {
  return measurePerformance('OCR:extractText', async () => {
    const { language = 'eng', onProgress } = options;
    
    try {
      // Initialize worker with specified language
      await workerManager.initialize(language);
      
      // Process the image
      const result = await workerManager.process(image, {
        // Additional Tesseract options can be added here
        logger: onProgress ? (m: LoggerMessage) => {
          if (m.status === 'recognizing text') {
            onProgress(m.progress);
          }
        } : undefined,
      });
      
      return result.data.text;
    } catch (error) {
      console.error('[OCR] Text extraction failed:', error);
      throw error;
    }
  });
}

/**
 * Extract text from a PDF page image
 * Specialization for PDF pages which often have specific formatting
 */
export async function extractTextFromPdfPage(
  pageImage: HTMLCanvasElement,
  options: ExtractTextOptions & {
    pageNumber?: number;
    isParagraphDetectionEnabled?: boolean;
  } = {}
): Promise<string> {
  const { 
    pageNumber = 1, 
    isParagraphDetectionEnabled = true,
    ...textOptions 
  } = options;
  
  return measurePerformance(`OCR:extractTextFromPdfPage:${pageNumber}`, async () => {
    const text = await extractTextFromImage(pageImage, textOptions);
    
    // If paragraph detection is enabled, we attempt to improve formatting
    if (isParagraphDetectionEnabled) {
      return improveTextFormatting(text);
    }
    
    return text;
  });
}

/**
 * Improve text formatting by detecting paragraphs and fixing common OCR issues
 */
function improveTextFormatting(text: string): string {
  // Basic formatting improvements
  const improvedText = text
    // Replace multiple spaces with a single space
    .replace(/\s+/g, ' ')
    // Fix common OCR errors
    .replace(/([a-z])\.([A-Z])/g, '$1. $2') // Add space after period
    .replace(/([a-z]),([a-z])/gi, '$1, $2') // Add space after comma
    .replace(/([a-z]):([a-z])/gi, '$1: $2') // Add space after colon
    // Fix paragraph breaks (line + whitespace + line)
    .replace(/(\r?\n)\s*(\r?\n)/g, '$1$2')
    // Remove extra line breaks between parts of the same sentence
    .replace(/(\w)\n(\w)/g, '$1 $2')
    // Trim whitespace
    .trim();
  
  return improvedText;
}

/**
 * Clean up OCR workers when they're no longer needed
 * Call this when leaving a page or component to free resources
 */
export async function cleanupOCRWorkers(): Promise<void> {
  await workerManager.terminate();
} 