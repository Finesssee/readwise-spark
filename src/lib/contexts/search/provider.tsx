import React, { useReducer, useCallback, useEffect, useRef, ReactNode } from 'react';
import { searchArticles } from '@/utils/mockData';
import { SearchFilters } from '@/lib/types/search';
import { initialState } from './constants';
import { searchReducer } from './reducer';
import { SearchContext } from './context';

interface SearchProviderProps {
  children: ReactNode;
}

export const SearchProvider = ({ children }: SearchProviderProps) => {
  const [state, dispatch] = useReducer(searchReducer, initialState);
  const isInitialMount = useRef(true);
  const previousFilters = useRef(state.filters);

  const search = useCallback(async (query: string, filters?: SearchFilters) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const results = searchArticles(query, filters || state.filters);
      
      dispatch({ type: 'SET_RESULTS', payload: results });
      dispatch({ type: 'SET_ERROR', payload: null });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'An error occurred' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.filters]);

  // Handle filter changes
  useEffect(() => {
    // Skip the first render
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Check if filters have actually changed
    if (JSON.stringify(previousFilters.current) === JSON.stringify(state.filters)) {
      return;
    }

    // Update previous filters
    previousFilters.current = state.filters;

    // Perform the search
    search(state.query, state.filters);
  }, [state.filters, state.query, search]);

  const value = {
    state,
    dispatch,
    search
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
}; 