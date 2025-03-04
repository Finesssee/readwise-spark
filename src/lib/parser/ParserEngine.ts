/**
 * Parser Engine
 * Core implementation of the high-performance document parsing system
 */

import { v4 as uuidv4 } from 'uuid';
import {
  DocumentFormat,
  ParsingStage,
  ParserOptions,
  ParsingResult,
  ParsingMetrics,
  DocumentParser,
  ParserStage,
  DocumentMetadata,
  ContentChunk,
  TocItem
} from './types';

// Default parser options
const DEFAULT_OPTIONS: ParserOptions = {
  chunkSize: 1024 * 1024, // 1 MB chunks
  parallelism: Math.max(1, navigator.hardwareConcurrency - 1), // Use all but one CPU core
  enableProgressiveLoading: true,
  enableCaching: true,
  useWasm: true,
  useWebWorkers: true,
  useStreaming: true
};

// Cache for parsed documents
const documentCache = new Map<string, { 
  result: ParsingResult;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}>();

/**
 * High-performance document parser engine
 */
export class ParserEngine implements DocumentParser {
  private stages: Map<ParsingStage, ParserStage> = new Map();
  private formatDetectors: Map<DocumentFormat, (file: File) => boolean> = new Map();
  private isProcessing: boolean = false;
  private currentProgress: number = 0;
  private abortController: AbortController | null = null;
  
  constructor() {
    // Register default format detectors
    this.registerDefaultFormatDetectors();
  }
  
  /**
   * Parse a file to extract content and metadata
   */
  public async parseFile(file: File, options?: ParserOptions): Promise<ParsingResult> {
    try {
      // Initialize abort controller for cancellation
      this.abortController = new AbortController();
      this.isProcessing = true;
      this.currentProgress = 0;
      
      const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
      
      // 1. Check cache if enabled
      if (mergedOptions.enableCaching) {
        const cacheKey = await this.generateCacheKey(file);
        const cachedResult = documentCache.get(cacheKey);
        
        if (cachedResult && (Date.now() - cachedResult.timestamp < cachedResult.ttl)) {
          console.log('Using cached parsing result');
          this.currentProgress = 100;
          this.isProcessing = false;
          return { ...cachedResult.result };
        }
      }
      
      // 2. Detect file format
      const format = this.detectFormat(file);
      console.log(`Detected format: ${format}`);
      
      // 3. Initialize metrics
      const metrics: ParsingMetrics = {
        startTime: performance.now(),
        bytesProcessed: 0,
        stageTimings: {
          [ParsingStage.EXTRACTION]: 0,
          [ParsingStage.CLEANING]: 0,
          [ParsingStage.NORMALIZATION]: 0,
          [ParsingStage.RENDERING]: 0,
          [ParsingStage.INDEXING]: 0
        }
      };
      
      // 4. Process through pipeline stages
      let data = { file, format };
      const allStages = Array.from(this.stages.values())
        .filter(stage => stage.supports(format))
        .sort((a, b) => this.getStageOrder(a.name) - this.getStageOrder(b.name));
      
      // Progressive notification percentage allocation
      const stagePercentages = this.calculateStagePercentages(allStages);
      let completedPercentage = 0;
      
      for (const stage of allStages) {
        // Check for cancellation
        if (this.abortController.signal.aborted) {
          throw new Error('Parsing cancelled');
        }
        
        const stageStart = performance.now();
        console.log(`Starting stage: ${stage.name}`);
        
        try {
          // Process the stage
          data = await stage.process(data, mergedOptions);
          
          // Update metrics
          const stageDuration = performance.now() - stageStart;
          metrics.stageTimings[stage.name] = stageDuration;
          
          // Call stage complete callback if provided
          if (mergedOptions.onStageComplete) {
            mergedOptions.onStageComplete(stage.name, data);
          }
          
          // Update progress
          completedPercentage += stagePercentages[stage.name] || 0;
          this.currentProgress = Math.min(99, completedPercentage); // Reserve 1% for finalization
          
          if (mergedOptions.onProgress) {
            mergedOptions.onProgress(this.currentProgress);
          }
          
          console.log(`Completed stage: ${stage.name} in ${stageDuration.toFixed(2)}ms`);
        } catch (error) {
          console.error(`Error in stage ${stage.name}:`, error);
          
          // Call error callback if provided
          if (mergedOptions.onError) {
            mergedOptions.onError(error instanceof Error ? error : new Error(String(error)), stage.name);
          }
          
          throw error;
        }
      }
      
      // 5. Finalize the result
      const result = this.finalizeResult(data, format, metrics);
      
      // 6. Cache the result if enabled
      if (mergedOptions.enableCaching) {
        const cacheKey = await this.generateCacheKey(file);
        documentCache.set(cacheKey, {
          result: { ...result },
          timestamp: Date.now(),
          ttl: 30 * 60 * 1000 // 30 minutes cache TTL
        });
      }
      
      // 7. Complete processing
      metrics.endTime = performance.now();
      metrics.bytesProcessed = file.size;
      
      this.currentProgress = 100;
      if (mergedOptions.onProgress) {
        mergedOptions.onProgress(100);
      }
      
      this.isProcessing = false;
      console.log(`Parsing completed in ${(metrics.endTime - metrics.startTime).toFixed(2)}ms`);
      
      return result;
    } catch (error) {
      this.isProcessing = false;
      console.error('Parsing failed:', error);
      throw error;
    } finally {
      this.abortController = null;
    }
  }
  
  /**
   * Parse from ArrayBuffer
   */
  public async parseArrayBuffer(buffer: ArrayBuffer, fileName: string, options?: ParserOptions): Promise<ParsingResult> {
    // Convert ArrayBuffer to File
    const file = new File([buffer], fileName, {
      type: this.getMimeTypeFromFileName(fileName)
    });
    
    return this.parseFile(file, options);
  }
  
  /**
   * Parse content from URL
   */
  public async parseUrl(url: string, options?: ParserOptions): Promise<ParsingResult> {
    try {
      // Fetch the content
      const response = await fetch(url, {
        signal: this.abortController?.signal
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
      }
      
      // Get file name from URL or Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let fileName = url.split('/').pop() || 'document';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]*)"?/);
        if (filenameMatch && filenameMatch[1]) {
          fileName = filenameMatch[1];
        }
      }
      
      // Create File from the response
      const buffer = await response.arrayBuffer();
      return this.parseArrayBuffer(buffer, fileName, options);
    } catch (error) {
      console.error('Failed to parse URL:', error);
      throw error;
    }
  }
  
  /**
   * Add a parsing stage to the pipeline
   */
  public addStage(stage: ParserStage): void {
    this.stages.set(stage.name, stage);
  }
  
  /**
   * Remove a parsing stage from the pipeline
   */
  public removeStage(stageName: ParsingStage): void {
    this.stages.delete(stageName);
  }
  
  /**
   * Register a format detector
   */
  public registerFormat(format: DocumentFormat, detector: (file: File) => boolean): void {
    this.formatDetectors.set(format, detector);
  }
  
  /**
   * Detect the format of a file
   */
  public detectFormat(file: File): DocumentFormat {
    for (const [format, detector] of this.formatDetectors.entries()) {
      if (detector(file)) {
        return format;
      }
    }
    return 'Unknown';
  }
  
  /**
   * Cancel the current processing operation
   */
  public cancelProcessing(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.isProcessing = false;
      console.log('Parsing cancelled');
    }
  }
  
  /**
   * Get the current progress (0-100)
   */
  public getProgress(): number {
    return this.currentProgress;
  }
  
  /**
   * Register default format detectors
   */
  private registerDefaultFormatDetectors(): void {
    // PDF detector
    this.registerFormat('PDF', (file: File) => {
      return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    });
    
    // EPUB detector
    this.registerFormat('EPUB', (file: File) => {
      return file.type === 'application/epub+zip' || file.name.toLowerCase().endsWith('.epub');
    });
    
    // HTML detector
    this.registerFormat('HTML', (file: File) => {
      return file.type === 'text/html' || 
             file.name.toLowerCase().endsWith('.html') || 
             file.name.toLowerCase().endsWith('.htm');
    });
    
    // Text detector
    this.registerFormat('Text', (file: File) => {
      return file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt');
    });
    
    // Markdown detector
    this.registerFormat('Markdown', (file: File) => {
      return file.type === 'text/markdown' || 
             file.name.toLowerCase().endsWith('.md') || 
             file.name.toLowerCase().endsWith('.markdown');
    });
    
    // CSV detector
    this.registerFormat('CSV', (file: File) => {
      return file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv');
    });
    
    // JSON detector
    this.registerFormat('JSON', (file: File) => {
      return file.type === 'application/json' || file.name.toLowerCase().endsWith('.json');
    });
  }
  
  /**
   * Get the order of a stage in the pipeline
   */
  private getStageOrder(stage: ParsingStage): number {
    const order = {
      [ParsingStage.EXTRACTION]: 0,
      [ParsingStage.CLEANING]: 1,
      [ParsingStage.NORMALIZATION]: 2,
      [ParsingStage.RENDERING]: 3,
      [ParsingStage.INDEXING]: 4
    };
    
    return order[stage] || 99;
  }
  
  /**
   * Calculate percentage allocation for each stage for progress reporting
   */
  private calculateStagePercentages(stages: ParserStage[]): Record<ParsingStage, number> {
    const stageWeights = {
      [ParsingStage.EXTRACTION]: 40,   // Extraction is usually the most intensive
      [ParsingStage.CLEANING]: 20,
      [ParsingStage.NORMALIZATION]: 20,
      [ParsingStage.RENDERING]: 15,
      [ParsingStage.INDEXING]: 5
    };
    
    const result: Record<ParsingStage, number> = {
      [ParsingStage.EXTRACTION]: 0,
      [ParsingStage.CLEANING]: 0,
      [ParsingStage.NORMALIZATION]: 0,
      [ParsingStage.RENDERING]: 0,
      [ParsingStage.INDEXING]: 0
    };
    
    // Calculate total weight of active stages
    const totalWeight = stages.reduce((sum, stage) => sum + (stageWeights[stage.name] || 0), 0);
    
    // Distribute percentages based on weights
    if (totalWeight > 0) {
      stages.forEach(stage => {
        result[stage.name] = (stageWeights[stage.name] / totalWeight) * 99; // Reserve 1% for finalization
      });
    } else {
      // Equal distribution if no weights
      const equalPercentage = 99 / Math.max(1, stages.length);
      stages.forEach(stage => {
        result[stage.name] = equalPercentage;
      });
    }
    
    return result;
  }
  
  /**
   * Generate a cache key for a file
   */
  private async generateCacheKey(file: File): Promise<string> {
    // Simple hash based on file size, name, and last modified date
    // For production, consider using a more robust hashing algorithm
    const hashInput = `${file.name}-${file.size}-${file.lastModified}`;
    let hash = 0;
    
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    
    return `${hash}`;
  }
  
  /**
   * Finalize and format the parsing result
   */
  private finalizeResult(data: any, format: DocumentFormat, metrics: ParsingMetrics): ParsingResult {
    // Extract required fields from the processed data
    const {
      metadata = {} as DocumentMetadata,
      chunks = [] as ContentChunk[],
      text = '',
      html,
      toc = [] as TocItem[],
      assets = {}
    } = data;
    
    // Ensure all required fields are present
    return {
      format,
      metadata,
      chunks,
      text,
      html,
      toc,
      metrics,
      assets
    };
  }
  
  /**
   * Get MIME type from file name
   */
  private getMimeTypeFromFileName(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'epub': 'application/epub+zip',
      'html': 'text/html',
      'htm': 'text/html',
      'txt': 'text/plain',
      'md': 'text/markdown',
      'markdown': 'text/markdown',
      'csv': 'text/csv',
      'json': 'application/json'
    };
    
    return extension && mimeTypes[extension] ? mimeTypes[extension] : 'application/octet-stream';
  }
} 