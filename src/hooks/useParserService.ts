import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { createParserQueryOptions } from '../utils/queryClient';
import { measurePerformance } from '../utils/performanceMonitoring';

/**
 * Type for file parsing options
 */
interface ParseOptions {
  extractText?: boolean;
  extractMetadata?: boolean;
  extractOutline?: boolean;
  extractImages?: boolean;
  highQuality?: boolean;
}

/**
 * Type for parsing result
 */
interface ParseResult {
  id: string;
  text: string;
  metadata?: Record<string, any>;
  outline?: any[];
  images?: string[];
  processingTimeMs?: number;
}

/**
 * Custom hook for parsing a file with the parser service
 */
export function useParseFile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      file, 
      options = {} 
    }: { 
      file: File; 
      options?: ParseOptions;
    }): Promise<ParseResult> => {
      return measurePerformance('parseFile', async () => {
        const formData = new FormData();
        formData.append('file', file);
        
        if (options.extractText !== undefined) {
          formData.append('extractText', String(options.extractText));
        }
        
        if (options.extractMetadata !== undefined) {
          formData.append('extractMetadata', String(options.extractMetadata));
        }
        
        if (options.extractOutline !== undefined) {
          formData.append('extractOutline', String(options.extractOutline));
        }
        
        if (options.extractImages !== undefined) {
          formData.append('extractImages', String(options.extractImages));
        }
        
        if (options.highQuality !== undefined) {
          formData.append('highQuality', String(options.highQuality));
        }
        
        try {
          const response = await axios.post<ParseResult>(
            'http://localhost:3000/parse', 
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
              timeout: 60000, // 60 seconds timeout for large files
            }
          );
          
          return response.data;
        } catch (error) {
          console.error('Error parsing file:', error);
          throw error;
        }
      });
    },
    onSuccess: (data) => {
      // Cache the parsed result by its ID for future reference
      queryClient.setQueryData(['parsedDocument', data.id], data);
    },
  });
}

/**
 * Fetch a previously parsed document by ID
 */
export function useParsedDocument(documentId: string | undefined) {
  return useQuery({
    ...createParserQueryOptions(['parsedDocument', documentId]),
    queryFn: async () => {
      if (!documentId) {
        throw new Error('Document ID is required');
      }
      
      try {
        const response = await axios.get<ParseResult>(
          `http://localhost:3000/documents/${documentId}`
        );
        return response.data;
      } catch (error) {
        console.error(`Error fetching document ${documentId}:`, error);
        throw error;
      }
    },
    // Don't run the query if documentId is undefined
    enabled: !!documentId,
  });
}

/**
 * Check the health status of the parser service
 */
export function useParserServiceStatus() {
  return useQuery({
    queryKey: ['parserServiceStatus'],
    queryFn: async () => {
      try {
        const response = await axios.get('http://localhost:3000/system-status');
        return {
          isHealthy: true,
          status: response.data,
        };
      } catch (error) {
        return {
          isHealthy: false,
          error: (error as Error).message,
        };
      }
    },
    // Check status every minute
    refetchInterval: 60 * 1000,
    // Don't retry on error for status checks
    retry: false,
  });
} 