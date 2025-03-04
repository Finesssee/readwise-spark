import { createContext } from 'react';
import { SearchContextType } from '@/lib/types/search';

// Create the context
export const SearchContext = createContext<SearchContextType | undefined>(undefined); 