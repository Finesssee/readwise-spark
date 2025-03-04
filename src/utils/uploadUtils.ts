import { v4 as uuidv4 } from 'uuid';
import { Article, FileProcessingOptions } from '@/lib/types';
import { updateArticle } from '@/utils/mockData';
import { extractMetadata } from '@/utils/metadata';

// Map file extensions to source categories
const fileExtensionMap: Record<string, string> = {
  pdf: 'PDF',
  epub: 'Book',
  html: 'Web',
  htm: 'Web',
  txt: 'Text',
  md: 'Note',
  markdown: 'Note',
};

// Map MIME types to source categories as a fallback
const mimeTypeMap: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/epub+zip': 'Book',
  'text/html': 'Web',
  'text/plain': 'Text',
  'text/markdown': 'Note',
};

/**
 * Efficiently detects the file type based on file extension and MIME type
 */
export function detectFileType(file: File): string | null {
  // First try by file extension (faster)
  const filename = file.name.trim();
  const lastDotIndex = filename.lastIndexOf('.');
  
  if (lastDotIndex !== -1) {
    const extension = filename.slice(lastDotIndex + 1).toLowerCase();
    const fileTypeByExtension = fileExtensionMap[extension];
    if (fileTypeByExtension) return fileTypeByExtension;
  }
  
  // Try by MIME type if extension doesn't work
  if (file.type) {
    const fileTypeByMime = mimeTypeMap[file.type];
    if (fileTypeByMime) return fileTypeByMime;
    
    // Special case checks for partial matches
    if (file.type.includes('pdf')) return 'PDF';
    if (file.type.includes('epub')) return 'Book';
  }
  
  return null;
}

/**
 * Process an uploaded file and create an Article from it
 */
export async function processUploadedFile(
  file: File, 
  options: FileProcessingOptions = {}
): Promise<{ 
  status: 'success' | 'error'; 
  message: string; 
  article?: Article; 
  readerId?: string 
}> {
  try {
    // Early validations - fail fast
    if (file.size === 0) {
      return { status: 'error', message: 'File is empty.' };
    }
    
    // Check file size (limit to 800MB)
    const MAX_FILE_SIZE = 800 * 1024 * 1024; // 800MB
    if (file.size > MAX_FILE_SIZE) {
      return { status: 'error', message: 'File too large. Maximum size is 800MB.' };
    }
    
    // Detect file type with optimized function
    const fileType = detectFileType(file);
    if (!fileType) {
      // Generate specific error message
      let errorMessage = 'Unsupported file type. ';
      
      if (file.name.lastIndexOf('.') === -1) {
        errorMessage += 'The file has no extension. ';
      } else {
        const extension = file.name.slice(file.name.lastIndexOf('.') + 1).toLowerCase();
        errorMessage += `The file extension "${extension}" is not supported. `;
      }
      
      errorMessage += 'Please upload EPUB, PDF, HTML, TXT, or MD files.';
      return { status: 'error', message: errorMessage };
    }
    
    // Create a blob URL for the file - needed for binary files
    const fileUrl = URL.createObjectURL(file);
    
    // Generate a unique ID for this article
    const articleId = uuidv4();
    
    // Create base article with minimal information for fast loading
    let article: Article = {
      id: articleId,
      title: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
      author: 'Uploaded by user',
      url: fileUrl,
      source: fileType,
      content: '', // Will be loaded later
      excerpt: `Loading ${fileType} content...`,
      date: new Date().toISOString(),
      readingTime: Math.ceil(file.size / (100 * 1024)), // Rough estimate based on file size
      saved: true,
      read: false,
      highlights: [],
      tags: ['Uploaded'],
      createdAt: new Date().toISOString()
    };
    
    // For quick initial display, add the article first with basic info
    updateArticle(article);
    
    // Start metadata extraction in the background
    // We want to navigate to the reader ASAP, so do this without blocking
    setTimeout(async () => {
      try {
        // Extract metadata - this could take time for large files
        const metadataStart = performance.now();
        console.log(`Starting metadata extraction for ${fileType} file: ${file.name}`);
        
        const metadata = await extractMetadata(file, fileType);
        console.log(`Metadata extraction completed in ${Math.round(performance.now() - metadataStart)}ms`);
        
        // Update article with extracted metadata
        const updatedArticle: Article = {
          ...article,
          ...metadata,
          // Don't overwrite the URL which is the blob URL we created
          url: article.url
        };
        
        // Update the article with metadata
        updateArticle(updatedArticle);
        
        // Load content for text-based files
        await loadContentInBackground(file, fileType, articleId);
        
      } catch (error) {
        console.error('Error during background processing:', error);
      }
    }, 10);
    
    return {
      status: 'success',
      message: `${fileType} file uploaded successfully.`,
      article,
      readerId: articleId // Return the article ID for immediate navigation
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'An unknown error occurred while processing the file.',
    };
  }
}

/**
 * Load content in background after navigation to reader
 * This allows the user to see the reader UI immediately while content loads
 */
async function loadContentInBackground(file: File, fileType: string, articleId: string): Promise<void> {
  try {
    // For text files, read the content
    let content = '';
    
    if (fileType === 'Text' || fileType === 'Note' || fileType === 'Web') {
      // Limit content reading to a reasonable size
      const MAX_TEXT_SIZE = 1 * 1024 * 1024; // 1MB
      if (file.size > MAX_TEXT_SIZE) {
        content = `[Large ${fileType} file - content preview not available]`;
      } else {
        content = await file.text();
      }
    } else if (fileType === 'PDF' && file.size < 10 * 1024 * 1024) {
      // For smaller PDFs, attempt to extract text for search/selection
      // This will be done via PDF.js in the reader component
      content = `[PDF file text content will be extracted during viewing]`;
    } else if (fileType === 'Book') {
      // For EPUB files, we'll load and parse chapters during viewing
      content = `[EPUB content will be loaded during viewing]`;
    } else {
      // For binary files like PDF, EPUB
      content = `[This is a ${fileType} file that was uploaded]`;
    }
    
    // Create excerpt from content
    const excerpt = content.length > 150 ? content.slice(0, 150) + '...' : content;
    
    // Get the existing article and update it with the content
    const existingArticle = await import('@/utils/mockData').then(m => m.getArticleById(articleId));
    
    if (existingArticle) {
      const updatedArticle: Article = {
        ...existingArticle,
        content,
        excerpt
      };
      
      // Update the article with content
      updateArticle(updatedArticle);
    }
  } catch (error) {
    console.error('Error loading content in background:', error);
  }
} 