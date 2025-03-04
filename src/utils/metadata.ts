import { Article } from '@/lib/types';
import pdfjs from 'pdfjs-dist';
import { Book } from 'epubjs';

/**
 * Extract metadata from a PDF file
 */
export async function extractPDFMetadata(file: File): Promise<Partial<Article>> {
  // Load the PDF document
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  
  // Get the metadata
  const metadata = await pdf.getMetadata();
  
  // Get the first page for thumbnail/preview
  const firstPage = await pdf.getPage(1);
  const viewport = firstPage.getViewport({ scale: 0.5 });
  
  // Create a canvas to render the first page
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext('2d');
  
  if (!context) {
    throw new Error('Could not create canvas context');
  }
  
  // Render the page to the canvas
  await firstPage.render({
    canvasContext: context,
    viewport: viewport
  }).promise;
  
  // Get the image data as a data URL
  const imageUrl = canvas.toDataURL('image/jpeg', 0.5);
  
  // Extract TOC (table of contents)
  const outline = await pdf.getOutline() || [];
  const tableOfContents = outline.map((item: any) => ({
    title: item.title,
    page: 0, // We'll need to resolve these destination references
    level: 0
  }));
  
  // Get page count
  const pageCount = pdf.numPages;
  
  // Estimate reading time based on page count
  // Average reading speed is about 2 minutes per page for PDFs
  const estimatedReadingTime = Math.max(1, Math.round(pageCount * 2));
  
  return {
    title: metadata?.info?.Title || file.name.replace(/\.[^/.]+$/, ''),
    author: metadata?.info?.Author || 'Unknown Author',
    imageUrl: imageUrl,
    pageCount: pageCount,
    readingTime: estimatedReadingTime,
    tableOfContents: tableOfContents,
    metadata: {
      creator: metadata?.info?.Creator || 'Unknown',
      producer: metadata?.info?.Producer || 'Unknown',
      creationDate: metadata?.info?.CreationDate || 'Unknown',
      modificationDate: metadata?.info?.ModDate || 'Unknown',
      keywords: metadata?.info?.Keywords || '',
    }
  };
}

/**
 * Extract metadata from an EPUB file
 */
export async function extractEPUBMetadata(file: File): Promise<Partial<Article>> {
  // Create a blob URL for the EPUB file
  const url = URL.createObjectURL(file);
  
  // Load the EPUB using epub.js
  const book = new Book(url);
  await book.ready;
  
  // Get the metadata
  const metadata = await book.loaded.metadata;
  
  // Get the cover image
  let coverUrl = '';
  try {
    const cover = await book.archive.getBlob(book.cover);
    coverUrl = URL.createObjectURL(cover);
  } catch (error) {
    console.error('Failed to extract cover from EPUB:', error);
  }
  
  // Get the table of contents
  const nav = await book.loaded.navigation;
  const tableOfContents = nav.toc.map(item => ({
    title: item.label.trim(),
    href: item.href,
    level: 0 // Calculate level based on indentation or structure
  }));
  
  // Get spine items (chapters)
  const spine = book.spine;
  const chapterCount = spine?.items?.length || 0;
  
  // Estimate reading time
  // Average reading time is about 5 minutes per chapter for EPUBs
  const estimatedReadingTime = Math.max(5, Math.round(chapterCount * 5));
  
  return {
    title: metadata.title || file.name.replace(/\.[^/.]+$/, ''),
    author: metadata.creator || 'Unknown Author',
    imageUrl: coverUrl,
    pageCount: chapterCount,
    readingTime: estimatedReadingTime,
    tableOfContents: tableOfContents,
    metadata: {
      publisher: metadata.publisher || 'Unknown',
      pubdate: metadata.pubdate || 'Unknown',
      modified_date: metadata.modified_date || 'Unknown',
      rights: metadata.rights || '',
      language: metadata.language || 'en',
    }
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