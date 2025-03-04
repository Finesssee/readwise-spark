import { Article } from '@/lib/types';
import { updateArticle } from '@/utils/mockData';
import * as PDFJS from 'pdfjs-dist';
import { Book } from 'epubjs';

// PDF related interfaces
interface PDFOutlineItem {
  title: string;
  dest?: string | string[];
  items?: PDFOutlineItem[];
  [key: string]: unknown;
}

interface PDFTableOfContentsItem {
  title: string;
  page: number;
  level: number;
}

// EPUB related interfaces
interface EPUBTocItem {
  label?: string;
  href?: string;
  level?: number;
  subitems?: EPUBTocItem[];
}

// Type for metadata with additional fields we handle
interface ArticleWithMetadata extends Partial<Article> {
  id?: string;
  imageUrl?: string;
  tableOfContents?: Array<{
    title: string;
    href?: string;
    level: number;
  }>;
}

/**
 * Extract metadata from a PDF file
 */
export async function extractPDFMetadata(file: File): Promise<Partial<Article>> {
  try {
    // PERFORMANCE OPTIMIZATION: Reduce work during initial processing
    const arrayBuffer = await file.arrayBuffer();
    // Only load document without rendering initially
    const pdf = await PDFJS.getDocument({ data: arrayBuffer }).promise;
    
    // Basic metadata - fast to retrieve
    const metadata = await pdf.getMetadata();
    const pageCount = pdf.numPages;
    
    // Safely access metadata properties
    const info = metadata?.info as Record<string, unknown> || {};
    
    // PERFORMANCE OPTIMIZATION: Minimal required processing for fast response
    const basicMetadata: Partial<Article> = {
      title: typeof info.Title === 'string' ? info.Title : file.name.replace(/\.[^/.]+$/, ''),
      author: typeof info.Author === 'string' ? info.Author : 'Unknown Author',
      pageCount: pageCount,
      readingTime: Math.max(1, Math.round(pageCount * 2)), // Estimate based on page count
      metadata: {
        creator: typeof info.Creator === 'string' ? info.Creator : 'Unknown',
        producer: typeof info.Producer === 'string' ? String(info.Producer || 'Unknown') : 'Unknown',
        creationDate: typeof info.CreationDate === 'string' ? String(info.CreationDate || 'Unknown') : 'Unknown',
        modificationDate: typeof info.ModDate === 'string' ? String(info.ModDate || 'Unknown') : 'Unknown',
        keywords: typeof info.Keywords === 'string' ? String(info.Keywords || '') : '',
      }
    };
    
    // PERFORMANCE OPTIMIZATION: Defer thumbnail and TOC generation 
    // to a separate async process that won't block returning basic metadata
    if (pageCount > 0) {
      // Perform heavier operations after returning basic metadata
      generatePDFThumbnailAndOutline(pdf, basicMetadata, file.name)
        .catch(error => console.error('Error generating PDF thumbnail or outline:', error));
    }
    
    return basicMetadata;
  } catch (error) {
    console.error('Error extracting PDF metadata:', error);
    return {
      title: file.name.replace(/\.[^/.]+$/, ''),
      author: 'Unknown Author',
      readingTime: 5 // Default reading time
    };
  }
}

/**
 * Generate thumbnail and extract outline for PDF in the background
 * This keeps the initial metadata extraction fast
 */
async function generatePDFThumbnailAndOutline(
  pdf: PDFJS.PDFDocumentProxy, 
  metadata: Partial<Article>, 
  fallbackName: string
): Promise<void> {
  try {
    // Generate a thumbnail from first page
    if (pdf.numPages > 0) {
      const firstPage = await pdf.getPage(1);
      const viewport = firstPage.getViewport({ scale: 0.3 }); // Reduced scale for faster rendering
      
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext('2d');
      
      if (context) {
        await firstPage.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
        
        // Get the image data as a data URL with lower quality for better performance
        const imageUrl = canvas.toDataURL('image/jpeg', 0.3);
        
        // Add thumbnail URL to metadata
        const articleMetadata = metadata as ArticleWithMetadata;
        articleMetadata.imageUrl = imageUrl;
        
        // Get any existing ID to update the article in storage
        const id = articleMetadata.id;
        if (id) {
          const { getArticleById, updateArticle } = await import('@/utils/mockData');
          const existingArticle = getArticleById(id);
          if (existingArticle) {
            updateArticle({
              ...existingArticle,
              imageUrl
            });
          }
        }
      }
    }
    
    // Extract outline/TOC and update if available
    const outline = await pdf.getOutline() || [];
    if (outline.length > 0) {
      const tableOfContents = outline.map((item: PDFOutlineItem) => ({
        title: item.title,
        page: 0, // Simplified - no destination resolution
        level: 0
      }));
      
      // Update tableOfContents in storage
      const articleMetadata = metadata as ArticleWithMetadata;
      articleMetadata.tableOfContents = tableOfContents;
      
      const id = articleMetadata.id;
      if (id) {
        const { getArticleById, updateArticle } = await import('@/utils/mockData');
        const existingArticle = getArticleById(id);
        if (existingArticle) {
          updateArticle({
            ...existingArticle,
            tableOfContents
          });
        }
      }
    }
  } catch (error) {
    console.error('Error in background PDF processing:', error);
  }
}

/**
 * Optimized metadata extraction from an EPUB file
 * Uses incremental processing to improve performance
 */
export async function extractEPUBMetadata(file: File): Promise<Partial<Article>> {
  try {
    console.time('epubMetadata');
    // Create a blob URL for the file
    const fileUrl = URL.createObjectURL(file);
    
    // Create a book instance
    const book = new Book(fileUrl);
    
    // Fast-path: Start with minimal metadata extraction
    await book.ready;
    
    // Extract basic metadata first (fast operation)
    const metadataObj = await book.loaded.metadata;
    // Safe type casting for metadata
    const metadata: Record<string, unknown> = metadataObj ? 
      (metadataObj as unknown as Record<string, unknown>) : {};
    const packageData = book.packaging;
    
    // Create initial metadata object with fast-to-access properties
    const initialMetadata: Partial<Article> = {
      title: typeof metadata.title === 'string' ? metadata.title : file.name.replace(/\.[^/.]+$/, ''),
      author: typeof metadata.creator === 'string' ? metadata.creator : 
             (Array.isArray(metadata.contributors) ? (metadata.contributors as string[]).join(', ') : ''),
      pageCount: packageData?.spine?.length || 0,
      imageUrl: null, // Will be extracted asynchronously later
      // Add basic metadata
      metadata: {
        creator: typeof metadata.creator === 'string' ? metadata.creator : '',
        publisher: typeof metadata.publisher === 'string' ? metadata.publisher : '',
        language: typeof metadata.language === 'string' ? metadata.language : '',
        pubdate: typeof metadata.pubdate === 'string' ? metadata.pubdate : '',
        rights: typeof metadata.rights === 'string' ? metadata.rights : '',
      }
    };

    // If we have a readingTime property, calculate a rough estimate
    initialMetadata.readingTime = Math.round(
      (initialMetadata.pageCount || 1) * 2 // Rough estimate of 2 minutes per "page"
    );

    // Get the cover image asynchronously - don't block main metadata return
    try {
      // Safe type casting for cover property access
      type BookWithCover = Book & { cover?: Promise<string> };
      const bookWithCover = book as BookWithCover;
      
      if (bookWithCover.cover) {
        const coverUrl = await bookWithCover.cover;
        if (coverUrl) {
          initialMetadata.imageUrl = coverUrl;
        }
      }
    } catch (e) {
      console.warn('Failed to get EPUB cover:', e);
    }
    
    // Start background processing of the rest of the book
    processEPUBInBackground(book, initialMetadata, file.name).catch(
      err => console.warn('EPUB background processing error:', err)
    );
    
    console.timeEnd('epubMetadata');
    return initialMetadata;
  } catch (error) {
    console.error('Error extracting EPUB metadata:', error);
    
    // Return minimal information on error
    return {
      title: file.name.replace(/\.[^/.]+$/, ''),
      author: '',
      pageCount: 0
    };
  }
}

/**
 * Process the EPUB in the background to avoid blocking the UI
 * Extracts additional metadata and updates the article progressively
 */
async function processEPUBInBackground(
  book: Book, 
  metadata: Partial<Article>,
  fallbackName: string
): Promise<void> {
  const articleId = metadata.id;
  if (!articleId) return;

  try {
    // Define worker thread-like scheduling using microtasks
    const yieldToMain = () => new Promise(resolve => setTimeout(resolve, 0));
    
    // Process in chunks to avoid UI freeze
    // 1. Extract table of contents
    const tocObj = await book.loaded.navigation;
    
    // Type safety for TOC extraction
    interface NavItem {
      label?: string;
      href?: string;
      level?: number;
      subitems?: NavItem[];
    }
    
    const toc = tocObj?.toc as NavItem[] || [];
    
    // Create a structured TOC if available
    if (toc?.length) {
      const tableOfContents = toc.map((item: NavItem) => ({
        title: item.label || 'Unnamed section',
        href: item.href || '',
        level: item.level || 0
      })).filter(item => item.title);
      
      // Update the article with TOC
      const updatedMetadata = { ...metadata, tableOfContents };
      await import('@/utils/mockData').then(m => {
        const existingArticle = m.getArticleById(articleId);
        if (existingArticle) {
          updateArticle({
            ...existingArticle,
            ...updatedMetadata
          });
        }
      });
    }
    
    await yieldToMain(); // Yield to main thread to avoid UI freeze
    
    // 2. Generate a summary/excerpt if possible
    try {
      let excerpt = '';
      
      // Type safety for spine access
      type BookWithSpine = Book & { 
        spine: { 
          items: Array<{ 
            href?: string | undefined; 
            [key: string]: unknown 
          }> 
        } 
      };
      
      // Get the first few paragraphs from the first chapter
      const bookWithSpine = book as unknown as BookWithSpine;
      const spine = bookWithSpine.spine;
      
      if (spine?.items?.length) {
        const firstItem = spine.items[0];
        // Convert href to string properly
        const href = String(firstItem.href || '');
        if (href) {
          const contents = await book.load(href);
          
          if (contents) {
            // Ensure contents is treated as a string
            const contentString = typeof contents === 'string' 
              ? contents 
              : String(contents);
              
            const doc = new DOMParser().parseFromString(contentString, 'text/html');
            const paragraphs = doc.querySelectorAll('p');
            
            for (let i = 0; i < Math.min(3, paragraphs.length); i++) {
              excerpt += paragraphs[i].textContent + ' ';
              if (excerpt.length > 300) break;
            }
            
            if (excerpt) {
              excerpt = excerpt.trim();
              if (excerpt.length > 300) {
                excerpt = excerpt.slice(0, 300) + '...';
              }
              
              // Update with excerpt
              await import('@/utils/mockData').then(m => {
                const existingArticle = m.getArticleById(articleId);
                if (existingArticle) {
                  updateArticle({
                    ...existingArticle,
                    excerpt
                  });
                }
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn('Error generating EPUB excerpt:', err);
    }
    
    // Clean up - convert URL to string properly
    const urlToRevoke = String(book.url);
    if (urlToRevoke.startsWith('blob:')) {
      URL.revokeObjectURL(urlToRevoke);
    }
  } catch (error) {
    console.error('Error in EPUB background processing:', error);
    // Clean up - convert URL to string properly
    try {
      const urlToRevoke = String(book.url);
      if (urlToRevoke.startsWith('blob:')) {
        URL.revokeObjectURL(urlToRevoke);
      }
    } catch (e) {
      console.warn('Failed to revoke URL:', e);
    }
  }
}

function processTocItem(item: Record<string, unknown>, level = 0): unknown {
  return {
    title: typeof item.label === 'string' ? item.label : '',
    level,
    href: typeof item.href === 'string' ? item.href : '',
    subitems: Array.isArray(item.subitems) ? 
      (item.subitems as Record<string, unknown>[]).map(subitem => processTocItem(subitem, level + 1)) : 
      []
  };
}

/**
 * Extract metadata from a file based on its type
 */
export async function extractMetadata(file: File, fileType: string): Promise<Partial<Article>> {
  try {
    switch (fileType) {
      case 'PDF':
        return await extractPDFMetadata(file);
      case 'Book':
        return await extractEPUBMetadata(file);
      default:
        // For text files, just return basic metadata
        return {
          title: file.name.replace(/\.[^/.]+$/, ''),
          author: 'Unknown',
          readingTime: Math.ceil(file.size / 2000) // Rough estimate: 2000 chars per minute
        };
    }
  } catch (error) {
    console.error(`Error extracting metadata for ${fileType} file:`, error);
    // Return basic info if metadata extraction fails
    return {
      title: file.name.replace(/\.[^/.]+$/, ''),
      author: 'Unknown',
      readingTime: Math.ceil(file.size / (100 * 1024)) // Fallback estimate
    };
  }
} 