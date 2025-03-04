/**
 * Parser Integration Layer
 * Connects the high-performance parser system with the existing upload utility
 */

import { Article } from '@/lib/types';
import { defaultParser, ParserOptions } from '@/lib/parser';
import { updateArticle } from '@/utils/mockData';

/**
 * Process a file using the high-performance parser and integrate with existing upload flow
 */
export async function processWithHighPerformanceParser(
  file: File,
  articleId: string,
  onProgress?: (progress: number) => void
): Promise<{
  status: 'success' | 'error';
  message: string;
  article?: Article;
  readerId?: string;
}> {
  try {
    console.log(`Processing ${file.name} with high-performance parser`);
    
    // Get existing article to update
    const { getArticleById } = await import('@/utils/mockData');
    const existingArticle = getArticleById(articleId);
    
    if (!existingArticle) {
      throw new Error('Article not found');
    }
    
    // Configure parser options
    const parserOptions: ParserOptions = {
      enableProgressiveLoading: true,
      enableCaching: true,
      useWasm: true,
      useWebWorkers: true,
      chunkSize: 1024 * 1024, // 1MB chunks
      parallelism: navigator.hardwareConcurrency ? Math.max(2, navigator.hardwareConcurrency - 1) : 4,
      onProgress: (progress) => {
        // Update article progress
        if (existingArticle) {
          updateArticle({
            ...existingArticle,
            progress: Math.min(99, Math.floor(progress))
          });
        }
        
        // Call external progress handler if provided
        if (onProgress) {
          onProgress(progress);
        }
      },
      onStageComplete: (stage, data) => {
        console.log(`Completed stage: ${stage}`);
        
        // If we have metadata at this point, update the article
        if (data.metadata && existingArticle) {
          updateArticle({
            ...existingArticle,
            title: data.metadata.title || existingArticle.title,
            author: data.metadata.author || existingArticle.author,
            imageUrl: data.metadata.coverUrl || existingArticle.imageUrl
          });
        }
      },
      onError: (error, stage) => {
        console.error(`Error in stage ${stage}:`, error);
      }
    };
    
    // Parse the file
    const result = await defaultParser.parseFile(file, parserOptions);
    
    // Update article with parsed data
    const updatedArticle: Article = {
      ...existingArticle,
      title: result.metadata.title || existingArticle.title,
      author: result.metadata.author || existingArticle.author,
      content: result.text,
      source: result.format,
      imageUrl: result.assets?.cover ? 
        (typeof result.assets.cover === 'string' ? result.assets.cover : URL.createObjectURL(result.assets.cover as Blob)) : 
        existingArticle.imageUrl,
      url: (result as any).fileUrl || existingArticle.url,
      pageCount: result.metadata.pageCount || existingArticle.pageCount,
      tableOfContents: result.toc.map(item => ({
        id: item.id,
        title: item.title,
        level: item.level,
        children: item.children ? item.children.map(child => ({
          id: child.id,
          title: child.title,
          level: child.level
        })) : undefined
      })),
      progress: 100,
      status: 'ready',
    };
    
    // Store processing time in a local variable for reporting
    const processingTimeMs = result.metrics.endTime ? result.metrics.endTime - result.metrics.startTime : 0;
    
    // Save updated article
    updateArticle(updatedArticle);
    
    return {
      status: 'success',
      message: `Successfully processed ${file.name} in ${processingTimeMs / 1000} seconds`,
      article: updatedArticle,
      readerId: articleId
    };
  } catch (error) {
    console.error('Error processing file with high-performance parser:', error);
    
    // Update article with error
    const { getArticleById } = await import('@/utils/mockData');
    const existingArticle = getArticleById(articleId);
    
    if (existingArticle) {
      updateArticle({
        ...existingArticle,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error during processing'
      });
    }
    
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to process file',
    };
  }
}

/**
 * Check if the high-performance parser supports a given file type
 */
export function supportsFileType(fileType: string): boolean {
  // Convert from our file type names to parser format names
  const formatMap: Record<string, string> = {
    'PDF': 'PDF',
    'EPUB': 'EPUB',
    'Book': 'EPUB',
    'Text': 'Text',
    'Note': 'Text',
    'HTML': 'HTML',
    'Web': 'HTML',
    'CSV': 'CSV',
    'JSON': 'JSON'
  };
  
  // Check if we have a mapping for this file type
  if (formatMap[fileType]) {
    return true;
  }
  
  return false;
} 