import { onCLS, onFID, onLCP, onFCP, onTTFB, Metric } from 'web-vitals';

type MetricName = 'CLS' | 'FID' | 'LCP' | 'FCP' | 'TTFB';

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
 */
export const measurePerformance = async <T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<T> => {
  const startTime = performance.now();
  
  try {
    const result = await operation();
    const duration = performance.now() - startTime;
    
    console.log(`[Performance] ${operationName} took ${duration.toFixed(2)}ms`);
    
    // Report custom metric for important operations
    if (duration > 1000) { // Only report operations taking > 1 second
      // Just log custom metrics rather than trying to fit them into the web-vitals format
      console.log(`[Performance] Custom metric - ${operationName}: ${duration.toFixed(2)}ms`);
    }
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`[Performance] ${operationName} failed after ${duration.toFixed(2)}ms`, error);
    throw error;
  }
};

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