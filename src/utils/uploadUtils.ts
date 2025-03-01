import { v4 as uuidv4 } from 'uuid';
import { Article } from '@/lib/types';
import { updateArticle } from './mockData';

export type FileType = 'epub' | 'pdf' | 'article' | 'unknown';
export type UploadStatus = 'success' | 'error' | 'processing';

export interface UploadResult {
  status: UploadStatus;
  message: string;
  article?: Article;
  type: FileType;
}

/**
 * Detects the file type based on extension
 */
export const detectFileType = (file: File): FileType => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'epub':
      return 'epub';
    case 'pdf':
      return 'pdf';
    case 'html':
    case 'txt':
    case 'md':
      return 'article';
    default:
      return 'unknown';
  }
};

/**
 * Processes the uploaded file and creates an article
 */
export const processUploadedFile = async (file: File): Promise<UploadResult> => {
  const fileType = detectFileType(file);
  
  // If unknown file type, reject it
  if (fileType === 'unknown') {
    return {
      status: 'error',
      message: `Unsupported file type. Please upload EPUB, PDF, HTML, TXT, or MD files.`,
      type: fileType
    };
  }
  
  try {
    // Create a promise that will resolve with the file content
    const fileContent = await readFileAsText(file);
    
    // Generate a new article from the file
    const newArticle = createArticleFromFile(file, fileContent, fileType);
    
    // Return success result
    return {
      status: 'success',
      message: `${file.name} was uploaded successfully and added to your ${getCategoryFromFileType(fileType)}.`,
      article: newArticle,
      type: fileType
    };
  } catch (error) {
    return {
      status: 'error',
      message: `Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      type: fileType
    };
  }
};

/**
 * Reads file content as text
 */
const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as string);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsText(file);
  });
};

/**
 * Creates an article object from the uploaded file
 */
const createArticleFromFile = (file: File, content: string, fileType: FileType): Article => {
  // Create a new article based on the file
  const now = new Date().toISOString();
  const excerpt = content.slice(0, 150) + '...';
  
  const article: Article = {
    id: uuidv4(),
    title: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
    source: getCategoryFromFileType(fileType),
    url: URL.createObjectURL(file), // Create a local URL for the file
    content: content.slice(0, 5000), // Truncate content for preview
    excerpt: excerpt, // Create a short excerpt
    date: now,
    readingTime: Math.max(1, Math.ceil(content.length / 1000)), // Rough estimate: 1 min per 1000 chars
    saved: true,
    read: false,
    highlights: [],
    tags: [fileType],
    createdAt: now
  };
  
  // Store the article
  updateArticle(article);
  
  return article;
};

/**
 * Gets the library category based on file type
 */
export const getCategoryFromFileType = (fileType: FileType): string => {
  switch (fileType) {
    case 'epub':
      return 'Books';
    case 'pdf':
      return 'PDFs';
    case 'article':
      return 'Articles';
    default:
      return 'Library';
  }
}; 