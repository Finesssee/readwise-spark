export interface Article {
  id: string;
  title: string;
  source: string;
  author?: string;
  url: string;
  date: string;
  content: string;
  excerpt: string;
  readingTime: number;
  imageUrl?: string;
  saved: boolean;
  read: boolean;
  highlights: Highlight[];
  tags?: string[];
  createdAt: string;
  readAt?: string;
  pageCount?: number;
  tableOfContents?: TableOfContentsItem[];
  metadata?: DocumentMetadata;
}

export interface TableOfContentsItem {
  title: string;
  page?: number;
  href?: string;
  level: number;
}

export interface DocumentMetadata {
  creator?: string;
  producer?: string;
  publisher?: string;
  creationDate?: string;
  modificationDate?: string;
  pubdate?: string;
  language?: string;
  rights?: string;
  keywords?: string;
}

export interface FileProcessingOptions {
  extractText?: boolean; // For OCR or text extraction from PDFs
  generateThumbnails?: boolean;
  textViewMode?: boolean; // For reflowed text view of PDFs
}

export interface Highlight {
  id: string;
  articleId: string;
  text: string;
  color: 'yellow' | 'blue' | 'green' | 'pink' | 'purple' | 'orange' | 'red' | 'teal';
  note?: string;
  tags?: string[];
  createdAt: string;
  // For PDF specific highlighting
  pageNumber?: number;
  position?: {
    boundingRect: DOMRect;
    rects: DOMRect[];
  };
  // For EPUB specific highlighting
  cfi?: string;
}

export type ArticleView = 'list' | 'grid';

export type ReaderViewMode = 'original' | 'text'; // original = PDF/EPUB layout, text = simplified text view
