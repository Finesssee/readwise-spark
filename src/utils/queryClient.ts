import { QueryClient, QueryOptions } from '@tanstack/react-query';
import { measurePerformance } from './performanceMonitoring';

// Create a query client for the entire app
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep data for 5 minutes in cache
      staleTime: 5 * 60 * 1000,
      // Retry 3 times with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch data on window focus (e.g., when user returns to the app)
      refetchOnWindowFocus: true,
      // Automatically track query performance
      meta: {
        measurePerformance: true
      },
    },
  },
});

// Performance tracking for React Query
const originalFetch = queryClient.fetchQuery.bind(queryClient);
queryClient.fetchQuery = async (...args) => {
  const queryKey = JSON.stringify(args[0]);
  return measurePerformance(
    `ReactQuery:${queryKey}`,
    () => originalFetch(...args)
  );
};

/**
 * Custom hook factory for parser service queries with specific options
 */
export const createParserQueryOptions = (
  queryKey: any[], 
  options: Partial<QueryOptions> = {}
) => {
  return {
    queryKey,
    ...options,
    // Parser operations can be slower, so we increase timeouts
    retry: 2,
    retryDelay: 1000,
    // Parsing operations rarely change, so we can cache longer
    staleTime: 30 * 60 * 1000, // 30 minutes
    // Use a tag to identify parser queries in DevTools
    meta: {
      ...(options.meta || {}),
      service: 'parser',
    },
  };
};

/**
 * Prefetch document data based on id or other criteria
 * Call this when you know the user is likely to view a document soon
 */
export const prefetchDocument = async (id: string) => {
  await queryClient.prefetchQuery({
    queryKey: ['document', id],
    queryFn: async () => {
      // Replace with your actual API call
      const response = await fetch(`/api/documents/${id}`);
      return response.json();
    },
  });
}; 