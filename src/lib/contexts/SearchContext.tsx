import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Article } from '@/lib/types';
import { searchArticles } from '@/utils/mockData';
import { SearchContextType, SearchState, SearchAction, SearchFilters } from '@/lib/types/search';

const initialState: SearchState = {
  query: '',
  filters: {
    readStatus: 'all',
  },
  results: [],
  isLoading: false,
  error: null,
};

const searchReducer = (state: SearchState, action: SearchAction): SearchState => {
  switch (action.type) {
    case 'SET_QUERY':
      return { ...state, query: action.payload };
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case 'SET_RESULTS':
      return { ...state, results: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
};

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

interface SearchProviderProps {
  children: ReactNode;
}

export const SearchProvider = ({ children }: SearchProviderProps) => {
  const [state, dispatch] = useReducer(searchReducer, initialState);

  const search = async (query: string, filters?: SearchFilters) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_QUERY', payload: query });
      if (filters) {
        dispatch({ type: 'SET_FILTERS', payload: filters });
      }

      const results = searchArticles(query, filters || state.filters);
      
      dispatch({ type: 'SET_RESULTS', payload: results });
      dispatch({ type: 'SET_ERROR', payload: null });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'An error occurred' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  return (
    <SearchContext.Provider value={{ state, dispatch, search }}>
      {children}
    </SearchContext.Provider>
  );
}; 