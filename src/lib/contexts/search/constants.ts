import { SearchState } from '@/lib/types/search';

export const initialState: SearchState = {
  query: '',
  filters: {
    readStatus: 'all',
  },
  results: [],
  isLoading: false,
  error: null,
}; 