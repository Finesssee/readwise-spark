import { onCLS, onFID, onLCP, onFCP, onTTFB, Metric } from 'web-vitals';

type MetricName = 'CLS' | 'FID' | 'LCP' | 'FCP' | 'TTFB';

/**
 * Performance data structure
 */
interface PerformanceData {
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  timestamp: string;
}

// Store performance data for analysis
const performanceLog: PerformanceData[] = [];

// Flag to enable/disable performance logging
const ENABLE_PERF_LOGGING = process.env.NODE_ENV === 'development';

/**
 * Reports vital metrics to your analytics service
 */
const reportMetric = (metric: Metric) => {
  // Replace with your analytics service
  console.log(`[Performance] ${metric.name}: ${metric.value}`);
  
  // You can send to your analytics service
  // Example: send to backend API
  if (process.env.NODE_ENV === 'production') {
    try {
      const body = JSON.stringify({
        name: metric.name,
        value: metric.value,
        id: metric.id,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        // You can add user ID or session ID here
      });
      
      // Using sendBeacon for non-blocking metrics reporting
      navigator.sendBeacon('/api/metrics', body);
    } catch (error) {
      console.error('Failed to report performance metric:', error);
    }
  }
};

/**
 * Initializes performance monitoring
 * Call this function in your application's entry point
 */
export const initPerformanceMonitoring = () => {
  // Core Web Vitals
  onCLS(reportMetric);  // Cumulative Layout Shift
  onFID(reportMetric);  // First Input Delay
  onLCP(reportMetric);  // Largest Contentful Paint
  
  // Additional metrics
  onFCP(reportMetric);  // First Contentful Paint
  onTTFB(reportMetric); // Time to First Byte
  
  console.log('[Performance] Monitoring initialized');
};

/**
 * Custom performance measurement for specific operations
 * Use this to measure resource-intensive operations like document parsing
 * 
 * @param operation - Name of the operation being measured
 * @param fn - Async function to measure
 * @returns The result of the function
 */
export async function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  // Start timing
  const startTime = performance.now();
  
  try {
    // Execute the function
    const result = await fn();
    
    // End timing
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Log performance data
    logPerformance({
      operation,
      startTime,
      endTime,
      duration,
      timestamp: new Date().toISOString(),
    });
    
    // Report custom metric for important operations
    if (duration > 1000) { // Only report operations taking > 1 second
      console.log(`[Performance] Custom metric - ${operation}: ${duration.toFixed(2)}ms`);
    }
    
    return result;
  } catch (error) {
    // End timing even if there's an error
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Log performance data for the failed operation
    logPerformance({
      operation: `${operation} (failed)`,
      startTime,
      endTime,
      duration,
      timestamp: new Date().toISOString(),
    });
    
    // Re-throw the error
    console.error(`[Performance] ${operation} failed after ${duration.toFixed(2)}ms`, error);
    throw error;
  }
}

/**
 * Log performance data
 * @param data - Performance data to log
 */
function logPerformance(data: PerformanceData): void {
  // Add to performance log
  performanceLog.push(data);
  
  // Log to console in development
  if (ENABLE_PERF_LOGGING) {
    console.log(
      `[PERFORMANCE] ${data.operation}: ${data.duration.toFixed(2)}ms`,
      { 
        duration: data.duration,
        timestamp: data.timestamp
      }
    );
  }
}

/**
 * Track component render performance
 * Use this in React.useEffect to measure component rendering time
 */
export const trackComponentPerformance = (componentName: string) => {
  const startTime = performance.now();
  
  return () => {
    const duration = performance.now() - startTime;
    if (duration > 100) { // Only log slow renders (> 100ms)
      console.log(`[Performance] ${componentName} rendered in ${duration.toFixed(2)}ms`);
    }
  };
};

/**
 * Get all performance data
 * @returns Array of performance data entries
 */
export function getPerformanceLog(): PerformanceData[] {
  return [...performanceLog];
}

/**
 * Clear the performance log
 */
export function clearPerformanceLog(): void {
  performanceLog.length = 0;
}

/**
 * Calculate performance statistics for a specific operation
 * @param operation - Name of the operation to analyze
 * @returns Performance statistics
 */
export function getOperationStats(operation: string): {
  operation: string;
  count: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
} {
  const operationData = performanceLog.filter(
    (entry) => entry.operation === operation
  );
  
  if (operationData.length === 0) {
    return {
      operation,
      count: 0,
      totalDuration: 0,
      averageDuration: 0,
      minDuration: 0,
      maxDuration: 0,
    };
  }
  
  const totalDuration = operationData.reduce(
    (sum, entry) => sum + entry.duration,
    0
  );
  
  const durations = operationData.map((entry) => entry.duration);
  
  return {
    operation,
    count: operationData.length,
    totalDuration,
    averageDuration: totalDuration / operationData.length,
    minDuration: Math.min(...durations),
    maxDuration: Math.max(...durations),
  };
} 