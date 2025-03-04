/**
 * Document Parser System - Core Types
 * A high-performance multi-stage parsing pipeline for processing various document formats
 */

/**
 * Supported document formats for parsing
 */
export type DocumentFormat = 
  | 'PDF' 
  | 'EPUB' 
  | 'HTML' 
  | 'Text' 
  | 'Markdown' 
  | 'CSV' 
  | 'JSON'
  | 'Unknown';

/**
 * Parser processing stages
 */
export enum ParsingStage {
  EXTRACTION = 'extraction',   // Extract raw content from container formats
  CLEANING = 'cleaning',       // Clean up content, remove ads, unnecessary elements
  NORMALIZATION = 'normalization', // Convert to unified format
  RENDERING = 'rendering',     // Prepare for display
  INDEXING = 'indexing'        // Create search indices
}

/**
 * Performance metrics for the parsing process
 */
export interface ParsingMetrics {
  startTime: number;
  endTime?: number;
  bytesProcessed: number;
  stageTimings: Record<ParsingStage, number>;
  memoryUsage?: number;
}

/**
 * Configuration options for the parser
 */
export interface ParserOptions {
  // Processing options
  chunkSize?: number;          // Size of chunks for processing (bytes)
  parallelism?: number;        // Number of parallel processes to use
  maxMemoryUsage?: number;     // Maximum memory to use (bytes)
  
  // Feature toggles
  enableProgressiveLoading?: boolean;   // Load content progressively
  enableCaching?: boolean;              // Cache parsed results
  enableCompression?: boolean;          // Compress data during processing
  
  // Format-specific options
  formatOptions?: Record<DocumentFormat, any>;
  
  // Performance options
  useWasm?: boolean;           // Use WebAssembly implementations when available
  useWebWorkers?: boolean;     // Use Web Workers for background processing
  useStreaming?: boolean;      // Use streaming APIs when available
  
  // Callbacks
  onProgress?: (progress: number) => void;
  onStageComplete?: (stage: ParsingStage, data: any) => void;
  onError?: (error: Error, stage: ParsingStage) => void;
}

/**
 * Document metadata extracted during parsing
 */
export interface DocumentMetadata {
  title?: string;
  author?: string;
  publicationDate?: string;
  language?: string;
  publisher?: string;
  isbn?: string;
  pageCount?: number;
  wordCount?: number;
  characterCount?: number;
  tags?: string[];
  categories?: string[];
  toc?: TocItem[];
  [key: string]: any;  // Allow for format-specific metadata
}

/**
 * Table of contents item
 */
export interface TocItem {
  id: string;
  title: string;
  level: number;
  href?: string;
  children?: TocItem[];
}

/**
 * Chunk of processed content
 */
export interface ContentChunk {
  id: string;
  index: number;
  content: string;
  metadata?: {
    title?: string;
    level?: number;
    isHeading?: boolean;
    pageNumber?: number;
    [key: string]: any;
  };
}

/**
 * Result of the parsing process
 */
export interface ParsingResult {
  format: DocumentFormat;
  metadata: DocumentMetadata;
  chunks: ContentChunk[];
  text: string;              // Full text content
  html?: string;             // Formatted HTML content (if applicable)
  toc: TocItem[];            // Table of contents
  metrics: ParsingMetrics;
  assets?: {                 // Referenced assets (images, etc.)
    [key: string]: Blob | string;
  };
}

/**
 * Parser stage interface - each stage in the pipeline implements this
 */
export interface ParserStage {
  name: ParsingStage;
  process: (data: any, options: ParserOptions) => Promise<any>;
  supports: (format: DocumentFormat) => boolean;
}

/**
 * Parser interface - main entry point for document parsing
 */
export interface DocumentParser {
  // Core parsing methods
  parseFile: (file: File, options?: ParserOptions) => Promise<ParsingResult>;
  parseArrayBuffer: (buffer: ArrayBuffer, fileName: string, options?: ParserOptions) => Promise<ParsingResult>;
  parseUrl: (url: string, options?: ParserOptions) => Promise<ParsingResult>;
  
  // Stage control
  addStage: (stage: ParserStage) => void;
  removeStage: (stageName: ParsingStage) => void;
  
  // Format registration
  registerFormat: (format: DocumentFormat, detector: (file: File) => boolean) => void;
  
  // Utility methods
  detectFormat: (file: File) => DocumentFormat;
  cancelProcessing: () => void;
  getProgress: () => number;
} 