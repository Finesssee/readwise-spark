import { v4 as uuidv4 } from 'uuid';
import { Article } from '@/lib/types';
import { updateArticle } from '@/utils/mockData';

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
 * Detects the file type based on file extension and MIME type
 */
export function detectFileType(file: File): string | null {
  try {
    console.log('Detecting file type for:', file.name, 'MIME type:', file.type);
    
    // First try by file extension
    const filename = file.name.trim();
    const lastDotIndex = filename.lastIndexOf('.');
    
    if (lastDotIndex !== -1) {
      const extension = filename.slice(lastDotIndex + 1).toLowerCase();
      console.log('File extension:', extension);
      
      const fileTypeByExtension = fileExtensionMap[extension];
      if (fileTypeByExtension) {
        console.log('Detected file type by extension:', fileTypeByExtension);
        return fileTypeByExtension;
      }
      console.log('Extension not recognized:', extension);
    } else {
      console.log('No file extension found');
    }
    
    // If extension doesn't work, try by MIME type
    if (file.type) {
      const fileTypeByMime = mimeTypeMap[file.type];
      if (fileTypeByMime) {
        console.log('Detected file type by MIME type:', fileTypeByMime);
        return fileTypeByMime;
      }
      console.log('MIME type not recognized:', file.type);
    } else {
      console.log('No MIME type available');
    }
    
    // Special case for common file types that might have incorrect MIME types
    if (file.type.includes('pdf')) {
      console.log('Special case: PDF detected by MIME type substring');
      return 'PDF';
    }
    
    if (file.type.includes('epub')) {
      console.log('Special case: EPUB detected by MIME type substring');
      return 'Book';
    }
    
    console.log('Could not detect file type');
    return null;
  } catch (error) {
    console.error('Error detecting file type:', error);
    return null;
  }
}

/**
 * Process an uploaded file and create an Article from it
 */
export async function processUploadedFile(file: File): Promise<{ status: 'success' | 'error'; message: string; article?: Article }> {
  try {
    console.log('Processing file:', file.name, 'type:', file.type, 'size:', file.size);
    
    // Check if file is empty
    if (file.size === 0) {
      return { status: 'error', message: 'File is empty.' };
    }
    
    // Check file size (limit to 50MB)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_FILE_SIZE) {
      return { status: 'error', message: 'File too large. Maximum size is 50MB.' };
    }
    
    // Detect file type
    const fileType = detectFileType(file);
    if (!fileType) {
      // More specific error message
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
    
    // Create a blob URL for the file
    const fileUrl = URL.createObjectURL(file);
    console.log('Created blob URL:', fileUrl);
    
    // For text files, read the content
    let content = '';
    try {
      if (fileType === 'Text' || fileType === 'Note' || fileType === 'Web') {
        content = await file.text();
      } else {
        // For binary files like PDF, EPUB
        content = `[This is a ${fileType} file that was uploaded]`;
      }
    } catch (error) {
      console.error('Error reading file content:', error);
      content = 'Error reading file content';
    }
    
    // Create excerpt from content
    const excerpt = content.slice(0, 150) + (content.length > 150 ? '...' : '');
    
    // Get current timestamp
    const now = new Date().toISOString();
    
    // Create a new article
    const article: Article = {
      id: uuidv4(),
      title: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
      author: 'Uploaded by user',
      url: fileUrl,
      source: fileType,
      content: content,
      excerpt: excerpt,
      date: now,
      readingTime: Math.max(1, Math.ceil(content.length / 1000)), // Estimate reading time
      saved: true,
      read: false,
      highlights: [],
      tags: ['Uploaded'],
      createdAt: now
    };
    
    console.log('Created article:', article.id, article.title);
    
    // Add the article using the update function
    updateArticle(article);
    console.log('Article added to library');
    
    return {
      status: 'success',
      message: `${fileType} file uploaded successfully.`,
      article,
    };
  } catch (error) {
    console.error('Error processing file:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'An unknown error occurred while processing the file.',
    };
  }
} 