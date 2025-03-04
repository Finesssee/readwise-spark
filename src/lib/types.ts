export interface Article {
  id: string;
  title: string;
  source: string;
  author?: string;
  url?: string;
  date?: string;
  content: string;
  excerpt?: string;
  readingTime?: number;
  imageUrl?: string;
  saved?: boolean;
  read?: boolean;
  highlights?: Highlight[];
  tags?: string[];
  createdAt: string | number;
  readAt?: string;
  pageCount?: number;
  tableOfContents?: TableOfContentsItem[];
  metadata?: DocumentMetadata;
  fileSize?: number;
  status?: 'processing' | 'ready' | 'error';
  progress?: number;
  errorMessage?: string;
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
  extractText?: boolean;
  generateThumbnails?: boolean;
  textViewMode?: boolean;
  articleId?: string;
}

export interface Highlight {
  id: string;
  articleId: string;
  text: string;
  color: 'yellow' | 'blue' | 'green' | 'pink' | 'purple' | 'orange' | 'red' | 'teal';
  note?: string;
  tags?: string[];
  createdAt: string;
  pageNumber?: number;
  position?: {
    boundingRect: DOMRect;
    rects: DOMRect[];
  };
  cfi?: string;
}

export type ArticleView = 'list' | 'grid';

export type ReaderViewMode = 'original' | 'text';
