import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../utils/queryClient';

interface QueryProviderProps {
  children: React.ReactNode;
}

/**
 * Provides React Query client to the application
 * Wrap your app with this provider in your root component
 */
export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}; 