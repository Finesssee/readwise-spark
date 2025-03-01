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

/**
 * Detects the file type based on file extension
 */
export function detectFileType(file: File): string | null {
  try {
    console.log('Detecting file type for:', file.name);
    
    // Get the file extension (everything after the last dot)
    const filename = file.name.trim();
    const lastDotIndex = filename.lastIndexOf('.');
    
    if (lastDotIndex === -1) {
      console.log('No file extension found');
      return null;
    }
    
    const extension = filename.slice(lastDotIndex + 1).toLowerCase();
    console.log('File extension:', extension);
    
    const fileType = fileExtensionMap[extension];
    
    if (!fileType) {
      console.log('Unsupported file extension:', extension);
      return null;
    }
    
    console.log('Detected file type:', fileType);
    return fileType;
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
      return { status: 'error', message: 'Unsupported file type. Please upload EPUB, PDF, HTML, TXT, or MD files.' };
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