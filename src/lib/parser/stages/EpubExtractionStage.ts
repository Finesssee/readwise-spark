/**
 * EPUB Extraction Stage
 * Efficiently extracts content from EPUB files using streaming and web workers
 */

import JSZip from 'jszip';
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
 * Worker for parallel EPUB content processing
 */
class EpubWorker {
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
    // Create inline worker for EPUB content processing
    const workerBlob = new Blob([`
      self.onmessage = async function(e) {
        const { id, action, data } = e.data;
        
        try {
          let result;
          
          switch (action) {
            case 'parseXhtml':
              result = await parseXhtml(data.content, data.filepath);
              break;
            case 'parseNcx':
              result = await parseNcx(data.content);
              break;
            case 'parseOpf':
              result = await parseOpf(data.content);
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
      
      // Parse XHTML content to extract text and structure
      async function parseXhtml(content, filepath) {
        // Create a DOM parser for XHTML content
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'application/xhtml+xml');
        
        // Extract text content
        const body = doc.querySelector('body');
        if (!body) return { text: '', headings: [] };
        
        // Extract headings for TOC generation
        const headings = [];
        const headingElements = body.querySelectorAll('h1, h2, h3, h4, h5, h6');
        
        headingElements.forEach(heading => {
          const level = parseInt(heading.tagName.substring(1));
          headings.push({
            text: heading.textContent,
            level,
            id: heading.id || null
          });
        });
        
        // Process and clean the content
        let text = '';
        
        // Remove script and style elements
        const scripts = body.querySelectorAll('script, style');
        scripts.forEach(el => el.remove());
        
        // Extract text with proper paragraph breaks
        const paragraphs = body.querySelectorAll('p, div, li, td, th, h1, h2, h3, h4, h5, h6');
        paragraphs.forEach(p => {
          const content = p.textContent?.trim();
          if (content) {
            text += content + '\\n\\n';
          }
        });
        
        // If no structured content found, use all text
        if (!text.trim()) {
          text = body.textContent || '';
        }
        
        return {
          text: text.trim(),
          headings,
          filepath
        };
      }
      
      // Parse NCX file to extract table of contents
      async function parseNcx(content) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'application/xml');
        
        const navPoints = doc.querySelectorAll('navPoint');
        const toc = [];
        
        navPoints.forEach(navPoint => {
          const navLabel = navPoint.querySelector('navLabel text');
          const content = navPoint.querySelector('content');
          
          if (navLabel && content) {
            const label = navLabel.textContent;
            const src = content.getAttribute('src');
            const playOrder = navPoint.getAttribute('playOrder');
            
            if (label && src) {
              toc.push({
                label,
                href: src,
                playOrder: playOrder ? parseInt(playOrder) : null
              });
            }
          }
        });
        
        return { toc };
      }
      
      // Parse OPF file to extract metadata and spine
      async function parseOpf(content) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'application/xml');
        
        // Extract metadata
        const metadata = {};
        const metadataEl = doc.querySelector('metadata');
        if (metadataEl) {
          const title = metadataEl.querySelector('title');
          if (title) metadata.title = title.textContent;
          
          const creator = metadataEl.querySelector('creator');
          if (creator) metadata.creator = creator.textContent;
          
          const language = metadataEl.querySelector('language');
          if (language) metadata.language = language.textContent;
          
          const publisher = metadataEl.querySelector('publisher');
          if (publisher) metadata.publisher = publisher.textContent;
          
          const identifier = metadataEl.querySelector('identifier');
          if (identifier) metadata.identifier = identifier.textContent;
        }
        
        // Extract spine
        const spine = [];
        const spineEl = doc.querySelector('spine');
        if (spineEl) {
          const itemrefs = spineEl.querySelectorAll('itemref');
          itemrefs.forEach(itemref => {
            const idref = itemref.getAttribute('idref');
            if (idref) spine.push(idref);
          });
        }
        
        // Extract manifest
        const manifest = {};
        const manifestEl = doc.querySelector('manifest');
        if (manifestEl) {
          const items = manifestEl.querySelectorAll('item');
          items.forEach(item => {
            const id = item.getAttribute('id');
            const href = item.getAttribute('href');
            const mediaType = item.getAttribute('media-type');
            
            if (id && href) {
              manifest[id] = { href, mediaType };
            }
          });
        }
        
        return { metadata, spine, manifest };
      }
    `], { type: 'application/javascript' });
    
    const workerUrl = URL.createObjectURL(workerBlob);
    this.worker = new Worker(workerUrl);
    
    this.worker.onmessage = (e) => {
      const { id, result, error } = e.data;
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
      console.error('EPUB worker error:', e);
      
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
 * EPUB Extraction Stage
 * Handles extraction of content from EPUB files
 */
export class EpubExtractionStage implements ParserStage {
  public name = ParsingStage.EXTRACTION;
  private worker: EpubWorker;
  
  constructor() {
    this.worker = new EpubWorker();
  }
  
  public async process(data: any, options: ParserOptions): Promise<any> {
    const { file, format } = data;
    
    if (format !== 'EPUB') {
      return data; // Skip non-EPUB files
    }
    
    console.log('Processing EPUB file:', file.name);
    const startTime = performance.now();
    
    try {
      // Create a blob URL for immediate access
      const fileUrl = URL.createObjectURL(file);
      
      // Read the file as ArrayBuffer for processing
      const buffer = await file.arrayBuffer();
      
      // OPTIMIZATION: Process in chunks with streaming
      const zip = new JSZip();
      const zipContents = await zip.loadAsync(buffer, {
        // Use progressive chunking for better performance with large files
        checkCRC32: false, // Skip CRC32 checks for speed
      });
      
      // Update progress
      if (options.onProgress) {
        options.onProgress(10);
      }
      
      // Find container.xml to locate the OPF file
      const containerFile = zipContents.file('META-INF/container.xml');
      if (!containerFile) {
        throw new Error('Invalid EPUB: Missing container.xml');
      }
      
      const containerContent = await containerFile.async('text');
      const rootFilePath = this.extractRootFilePath(containerContent);
      
      if (!rootFilePath) {
        throw new Error('Invalid EPUB: Unable to find OPF file');
      }
      
      // Read the OPF file
      const opfFile = zipContents.file(rootFilePath);
      if (!opfFile) {
        throw new Error(`Invalid EPUB: OPF file not found at ${rootFilePath}`);
      }
      
      const opfContent = await opfFile.async('text');
      
      // Parse OPF to get metadata, spine, and manifest
      const opfData = await this.worker.process('parseOpf', { content: opfContent });
      const { metadata, spine, manifest } = opfData;
      
      if (options.onProgress) {
        options.onProgress(20);
      }
      
      // Extract base directory for resolving relative paths
      const rootDir = rootFilePath.substring(0, rootFilePath.lastIndexOf('/') + 1);
      
      // Locate and parse NCX file for TOC
      let ncxPath = null;
      
      // Find NCX file from manifest
      for (const [id, item] of Object.entries(manifest)) {
        // @ts-ignore - We know the structure
        if (item.mediaType === 'application/x-dtbncx+xml') {
          // @ts-ignore - We know the structure
          ncxPath = rootDir + item.href;
          break;
        }
      }
      
      let toc: any[] = [];
      
      if (ncxPath) {
        const ncxFile = zipContents.file(ncxPath);
        if (ncxFile) {
          const ncxContent = await ncxFile.async('text');
          const ncxData = await this.worker.process('parseNcx', { content: ncxContent });
          toc = ncxData.toc || [];
        }
      }
      
      if (options.onProgress) {
        options.onProgress(30);
      }
      
      // Process spine items to extract content
      const spineItems = spine.map(idref => {
        // @ts-ignore - We know the structure
        const item = manifest[idref];
        return item ? rootDir + item.href : null;
      }).filter(Boolean);
      
      // OPTIMIZATION: Process spine items in parallel with concurrency limit
      const concurrency = options.parallelism || 4;
      let completedItems = 0;
      const chunks: ContentChunk[] = [];
      let fullText = '';
      
      // Process in batches for better performance
      for (let i = 0; i < spineItems.length; i += concurrency) {
        const batch = spineItems.slice(i, i + concurrency);
        const batchPromises = batch.map(async (filepath, batchIndex) => {
          try {
            // @ts-ignore - We know the filepath is a string here
            const file = zipContents.file(filepath);
            if (!file) return null;
            
            const content = await file.async('text');
            const result = await this.worker.process('parseXhtml', { 
              content, 
              filepath 
            });
            
            completedItems++;
            
            // Update progress
            if (options.onProgress) {
              const baseProgress = 30;
              const progressPerItem = 60 / spineItems.length;
              options.onProgress(baseProgress + (completedItems * progressPerItem));
            }
            
            const index = i + batchIndex;
            
            return {
              id: uuidv4(),
              index,
              content: result.text,
              metadata: {
                // @ts-ignore - We know the structure
                title: result.headings[0]?.text || `Chapter ${index + 1}`,
                headings: result.headings,
                path: filepath
              }
            };
          } catch (err) {
            console.error(`Error processing EPUB spine item:`, err);
            return null;
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        const validResults = batchResults.filter(Boolean) as ContentChunk[];
        
        chunks.push(...validResults);
        
        // Append text to full content
        fullText += validResults.map(chunk => chunk.content).join('\n\n');
      }
      
      // Sort chunks by index
      chunks.sort((a, b) => a.index - b.index);
      
      // Extract cover image if available
      let coverUrl = null;
      
      try {
        // Try to find cover in common locations
        const coverPaths = [
          'cover.jpg', 'cover.jpeg', 'cover.png',
          'OEBPS/cover.jpg', 'OEBPS/cover.jpeg', 'OEBPS/cover.png',
          'OEBPS/images/cover.jpg', 'OEBPS/images/cover.jpeg', 'OEBPS/images/cover.png'
        ];
        
        for (const path of coverPaths) {
          const coverFile = zipContents.file(path);
          if (coverFile) {
            const coverBlob = await coverFile.async('blob');
            coverUrl = URL.createObjectURL(coverBlob);
            break;
          }
        }
      } catch (err) {
        console.warn('Failed to extract EPUB cover:', err);
      }
      
      // Process TOC to build structured table of contents
      const processedToc: TocItem[] = toc.map(item => ({
        id: uuidv4(),
        title: item.label,
        level: 1, // Default level
        href: item.href
      }));
      
      // Finalize the metadata
      const finalMetadata = {
        ...metadata,
        title: metadata.title || file.name.replace(/\.epub$/i, ''),
        author: metadata.creator,
        coverUrl
      };
      
      // Clean up
      // Note: We keep the fileUrl to allow direct opening in the EPUB reader
      
      const endTime = performance.now();
      console.log(`EPUB extraction completed in ${(endTime - startTime).toFixed(2)}ms`);
      
      return {
        ...data,
        metadata: finalMetadata,
        chunks,
        text: fullText,
        fileUrl, // Keep for direct EPUB reader access
        toc: processedToc,
        format: 'EPUB',
        assets: coverUrl ? { cover: coverUrl } : undefined
      };
    } catch (error) {
      console.error('EPUB extraction failed:', error);
      throw error;
    }
  }
  
  /**
   * Extract the root file path from container.xml
   */
  private extractRootFilePath(containerXml: string): string | null {
    const match = containerXml.match(/<rootfile[^>]*full-path=["']([^"']*)["']/);
    return match ? match[1] : null;
  }
  
  /**
   * Check if this stage supports the given format
   */
  public supports(format: DocumentFormat): boolean {
    return format === 'EPUB';
  }
} 