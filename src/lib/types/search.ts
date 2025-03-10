import { Article } from '@/lib/types';

export interface SearchFilters {
  readStatus: 'all' | 'read' | 'unread';
  source?: string;
  tags?: string[];
  dateRange?: {
    from: Date | null;
    to: Date | null;
  };
  hasHighlights?: boolean;
  hasNotes?: boolean;
}

export interface SearchState {
  query: string;
  filters: SearchFilters;
  results: Article[];
  isLoading: boolean;
  error: string | null;
}

export type SearchAction = 
  | { type: 'SET_QUERY'; payload: string }
  | { type: 'SET_FILTERS'; payload: Partial<SearchFilters> }
  | { type: 'SET_RESULTS'; payload: Article[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

export interface SearchContextType {
  state: SearchState;
  dispatch: React.Dispatch<SearchAction>;
  search: (query: string, filters?: SearchFilters) => Promise<void>;
} 