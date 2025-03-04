import { useContext } from 'react';
import { SearchContext } from './context';
import { SearchContextType } from '@/lib/types/search';

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}; 