/**
 * PDF Extraction Stage
 * High-performance extraction of content from PDF files
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ParsingStage,
  ParserStage,
  ParserOptions,
  DocumentFormat,
  ContentChunk,
  TocItem
} from '../types';

/**
 * Worker for PDF content processing
 */
class PdfWorker {
  private worker: Worker | null = null;
  private taskQueue: Array<{
    id: string;
    resolve: (result: any) => void;
    reject: (error: Error) => void;
  }> = [];
  
  constructor() {
    this.initWorker();
  }
  
  private initWorker() {
    // Create inline worker for PDF content processing using pdf.js
    const workerBlob = new Blob([`
      importScripts('https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js');
    
      // Global variables for worker scope
      let pdfjsLib = globalThis.pdfjsLib;
      
      self.onmessage = async function(e) {
        const { id, action, data } = e.data;
        
        try {
          let result;
          
          switch (action) {
            case 'getDocumentInfo':
              result = await getDocumentInfo(data.buffer);
              break;
            case 'extractPageText':
              result = await extractPageText(data.buffer, data.pageNumber);
              break;
            case 'extractPageRange':
              result = await extractPageRange(data.buffer, data.startPage, data.endPage);
              break;
            case 'extractOutline':
              result = await extractOutline(data.buffer);
              break;
            default:
              throw new Error('Unknown action: ' + action);
          }
          
          self.postMessage({ id, result, error: null });
        } catch (error) {
          self.postMessage({ 
            id, 
            result: null, 
            error: { message: error.message, stack: error.stack } 
          });
        }
      };
      
      // Get document info (metadata, page count, etc.)
      async function getDocumentInfo(buffer) {
        const loadingTask = pdfjsLib.getDocument({ data: buffer });
        const pdf = await loadingTask.promise;
        
        // Get metadata
        const metadata = await pdf.getMetadata();
        
        return {
          pageCount: pdf.numPages,
          metadata: metadata.info,
          fingerprint: pdf.fingerprints[0]
        };
      }
      
      // Extract text from a specific page
      async function extractPageText(buffer, pageNumber) {
        const loadingTask = pdfjsLib.getDocument({ data: buffer });
        const pdf = await loadingTask.promise;
        
        // Get the page
        const page = await pdf.getPage(pageNumber);
        
        // Get text content
        const textContent = await page.getTextContent();
        
        // Process text items
        let text = '';
        let lastY = null;
        
        // Get headings and structure
        const headings = [];
        let lastFontSize = 0;
        
        for (const item of textContent.items) {
          if ('str' in item) {
            const textItem = item;
            
            // Check for new paragraph based on position
            if (lastY !== null && Math.abs(textItem.transform[5] - lastY) > 10) {
              text += '\\n';
            }
            
            // Check for headings based on font size
            const fontSize = Math.sqrt(textItem.transform[0] * textItem.transform[0] + 
                                       textItem.transform[1] * textItem.transform[1]);
            
            // Detect headings based on font size
            if (fontSize > lastFontSize * 1.2 && textItem.str.trim().length > 0) {
              headings.push({
                text: textItem.str.trim(),
                level: Math.min(6, Math.max(1, Math.floor(7 - fontSize / 2))),
                fontSize,
                position: { x: textItem.transform[4], y: textItem.transform[5] }
              });
            }
            
            lastFontSize = Math.max(lastFontSize, fontSize);
            
            // Add space between words if needed
            if (text.length > 0 && !text.endsWith('\\n') && !text.endsWith(' ')) {
              text += ' ';
            }
            
            text += textItem.str;
            lastY = textItem.transform[5];
          }
        }
        
        return {
          pageNumber,
          text: text.trim(),
          headings
        };
      }
      
      // Extract text from a range of pages
      async function extractPageRange(buffer, startPage, endPage) {
        const loadingTask = pdfjsLib.getDocument({ data: buffer });
        const pdf = await loadingTask.promise;
        
        // Ensure valid range
        startPage = Math.max(1, startPage);
        endPage = Math.min(pdf.numPages, endPage);
        
        const pages = [];
        
        // Extract each page in the range
        for (let i = startPage; i <= endPage; i++) {
          try {
            const pageData = await extractPageText(buffer, i);
            pages.push(pageData);
            
            // Report progress
            self.postMessage({ 
              type: 'progress', 
              current: i - startPage + 1, 
              total: endPage - startPage + 1 
            });
          } catch (error) {
            console.error(\`Error extracting page \${i}:\`, error);
            // Continue with next page on error
          }
        }
        
        return { pages };
      }
      
      // Extract outline (table of contents)
      async function extractOutline(buffer) {
        const loadingTask = pdfjsLib.getDocument({ data: buffer });
        const pdf = await loadingTask.promise;
        
        // Try to get the outline
        try {
          const outline = await pdf.getOutline();
          
          if (!outline || outline.length === 0) {
            return { toc: [] };
          }
          
          // Process outline items
          const processTocItem = (item, level = 0) => {
            const processedItems = [];
            
            for (const entry of item) {
              const dest = entry.dest;
              let pageNumber = null;
              
              // Skip items without destination
              if (!dest) continue;
              
              const processed = {
                title: entry.title,
                level: level + 1,
                dest,
                items: entry.items ? processTocItem(entry.items, level + 1) : []
              };
              
              processedItems.push(processed);
            }
            
            return processedItems;
          };
          
          const toc = processTocItem(outline);
          
          return { toc };
        } catch (error) {
          console.error('Error extracting PDF outline:', error);
          return { toc: [] };
        }
      }
    `], { type: 'application/javascript' });
    
    const workerUrl = URL.createObjectURL(workerBlob);
    this.worker = new Worker(workerUrl);
    
    this.worker.onmessage = (e) => {
      const { id, result, error, type } = e.data;
      
      // Handle progress updates
      if (type === 'progress') {
        // Could dispatch progress events to listeners
        return;
      }
      
      const task = this.taskQueue.find(task => task.id === id);
      
      if (task) {
        // Remove task from queue
        this.taskQueue = this.taskQueue.filter(t => t.id !== id);
        
        if (error) {
          task.reject(new Error(error.message));
        } else {
          task.resolve(result);
        }
      }
    };
    
    this.worker.onerror = (e) => {
      console.error('PDF worker error:', e);
      
      // Reject all pending tasks
      this.taskQueue.forEach(task => {
        task.reject(new Error('Worker error: ' + e.message));
      });
      
      this.taskQueue = [];
      
      // Recreate worker
      this.worker = null;
      setTimeout(() => this.initWorker(), 100);
    };
    
    // Cleanup URL
    URL.revokeObjectURL(workerUrl);
  }
  
  public async process(action: string, data: any): Promise<any> {
    if (!this.worker) {
      this.initWorker();
    }
    
    return new Promise((resolve, reject) => {
      const id = uuidv4();
      
      this.taskQueue.push({ id, resolve, reject });
      
      this.worker!.postMessage({
        id,
        action,
        data
      });
    });
  }
  
  public terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    // Reject all pending tasks
    this.taskQueue.forEach(task => {
      task.reject(new Error('Worker terminated'));
    });
    
    this.taskQueue = [];
  }
}

/**
 * PDF Extraction Stage
 * Handles extraction of content from PDF files
 */
export class PdfExtractionStage implements ParserStage {
  public name = ParsingStage.EXTRACTION;
  private worker: PdfWorker;
  
  constructor() {
    this.worker = new PdfWorker();
  }
  
  public async process(data: any, options: ParserOptions): Promise<any> {
    const { file, format } = data;
    
    if (format !== 'PDF') {
      return data; // Skip non-PDF files
    }
    
    console.log('Processing PDF file:', file.name);
    const startTime = performance.now();
    
    try {
      // Update progress
      if (options.onProgress) {
        options.onProgress(5);
      }
      
      // Read the file as ArrayBuffer for processing
      const buffer = await file.arrayBuffer();
      
      // Get document info
      const info = await this.worker.process('getDocumentInfo', { buffer });
      
      if (options.onProgress) {
        options.onProgress(10);
      }
      
      console.log(`PDF has ${info.pageCount} pages`);
      
      // Extract outline (table of contents)
      const outlineData = await this.worker.process('extractOutline', { buffer });
      
      if (options.onProgress) {
        options.onProgress(15);
      }
      
      // Function to create TOC items from PDF outline
      const createTocItems = (items: any[]): TocItem[] => {
        return items.map(item => ({
          id: uuidv4(),
          title: item.title,
          level: item.level,
          children: item.items ? createTocItems(item.items) : undefined
        }));
      };
      
      const toc = createTocItems(outlineData.toc || []);
      
      // OPTIMIZATION: Process pages in chunks for better performance and memory usage
      const chunkSize = options.chunkSize ? Math.floor(options.chunkSize / 1024 / 1024) : 5; // Default to 5 pages per chunk
      const pageChunks = this.createPageChunks(info.pageCount, chunkSize);
      
      const chunks: ContentChunk[] = [];
      let fullText = '';
      let completedChunks = 0;
      
      // Process each chunk of pages
      for (const chunk of pageChunks) {
        // Extract pages in this chunk
        const chunkData = await this.worker.process('extractPageRange', {
          buffer,
          startPage: chunk.start,
          endPage: chunk.end
        });
        
        // Process the extracted pages
        for (const page of chunkData.pages) {
          const chunkId = uuidv4();
          
          // Create chunk for this page
          const contentChunk: ContentChunk = {
            id: chunkId,
            index: page.pageNumber - 1, // 0-based index
            content: page.text,
            metadata: {
              pageNumber: page.pageNumber,
              title: `Page ${page.pageNumber}`,
              headings: page.headings
            }
          };
          
          chunks.push(contentChunk);
          fullText += page.text + '\n\n';
        }
        
        // Update progress
        completedChunks++;
        if (options.onProgress) {
          const baseProgress = 15;
          const progressPerChunk = 80 / pageChunks.length;
          options.onProgress(baseProgress + (completedChunks * progressPerChunk));
        }
      }
      
      // Sort chunks by page number
      chunks.sort((a, b) => a.index - b.index);
      
      // Extract metadata
      const { info: metadata } = info.metadata;
      
      const finalMetadata = {
        title: metadata?.Title || file.name.replace(/\.pdf$/i, ''),
        author: metadata?.Author,
        subject: metadata?.Subject,
        keywords: metadata?.Keywords,
        creator: metadata?.Creator,
        producer: metadata?.Producer,
        creationDate: metadata?.CreationDate,
        modificationDate: metadata?.ModDate,
        pageCount: info.pageCount
      };
      
      const endTime = performance.now();
      console.log(`PDF extraction completed in ${(endTime - startTime).toFixed(2)}ms`);
      
      if (options.onProgress) {
        options.onProgress(95);
      }
      
      return {
        ...data,
        metadata: finalMetadata,
        chunks,
        text: fullText,
        toc,
        format: 'PDF'
      };
    } catch (error) {
      console.error('PDF extraction failed:', error);
      throw error;
    }
  }
  
  /**
   * Create chunks of pages for efficient processing
   */
  private createPageChunks(pageCount: number, pagesPerChunk: number): Array<{ start: number; end: number }> {
    const chunks = [];
    
    for (let i = 1; i <= pageCount; i += pagesPerChunk) {
      chunks.push({
        start: i,
        end: Math.min(i + pagesPerChunk - 1, pageCount)
      });
    }
    
    return chunks;
  }
  
  /**
   * Check if this stage supports the given format
   */
  public supports(format: DocumentFormat): boolean {
    return format === 'PDF';
  }
} 