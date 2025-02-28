
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
}

export interface Highlight {
  id: string;
  articleId: string;
  text: string;
  color: 'yellow' | 'blue' | 'green' | 'pink' | 'purple' | 'orange' | 'red' | 'teal';
  note?: string;
  tags?: string[];
  createdAt: string;
}

export type ArticleView = 'list' | 'grid';
