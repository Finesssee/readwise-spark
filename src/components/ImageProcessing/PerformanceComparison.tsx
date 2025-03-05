import React from 'react';
import { ProcessingResult } from './types';

interface PerformanceComparisonProps {
  results: ProcessingResult[];
}

const PerformanceComparison = React.memo(({ results }: PerformanceComparisonProps) => {
  // Skip rendering if there are no WASM results to compare
  if (!results.some(r => r.method === 'wasm')) {
    return null;
  }

  // Group results by method and calculate averages
  const methodAverages = ['client', 'server', 'wasm'].map(method => {
    const methodResults = results.filter(r => r.method === method);
    if (methodResults.length === 0) return { method, time: Infinity };
    
    const avgTime = methodResults.reduce((sum, r) => sum + r.processingTime, 0) / methodResults.length;
    return { method, time: avgTime };
  }).filter(m => m.time !== Infinity);
  
  // Find the fastest method
  const fastestMethod = [...methodAverages].sort((a, b) => a.time - b.time)[0]?.method;

  // Get a display name for each method
  const getMethodName = (method: string): string => {
    switch (method) {
      case 'client': return 'Browser (Canvas API)';
      case 'server': return 'Server (Simulated Sharp API)';
      case 'wasm': return 'WebAssembly (Sharp WASM)';
      default: return method;
    }
  };

  // Get a color class for each method
  const getMethodColorClass = (method: string): string => {
    switch (method) {
      case 'client': return 'bg-blue-500';
      case 'server': return 'bg-green-500';
      case 'wasm': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="mt-10">
      <h2 className="text-xl font-semibold mb-4">Performance Comparison</h2>
      <div className="p-4 bg-muted rounded-md">
        <h3 className="font-medium mb-2">Processing Times:</h3>
        <div className="space-y-2">
          {methodAverages.map(({ method, time }) => (
            <div key={method} className="flex items-center">
              <div className="w-40 font-medium">{getMethodName(method)}:</div>
              <div className="flex-1">
                <div className="bg-gray-200 h-4 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${getMethodColorClass(method)} ${method === fastestMethod ? 'animate-pulse' : ''}`}
                    style={{ width: `${Math.min(100, (time / 500) * 100)}%` }}
                  ></div>
                </div>
              </div>
              <div className="w-24 text-right">{time.toFixed(2)} ms</div>
              {method === fastestMethod && (
                <div className="w-24 text-right text-green-500 font-medium">Fastest!</div>
              )}
            </div>
          ))}
        </div>
        
        <p className="mt-4 text-sm text-muted-foreground">
          Note: These comparisons are based on the operations performed during this session.
          For more accurate benchmarking, try processing the same image multiple times with each method.
        </p>
      </div>
    </div>
  );
});

// Display name for debugging
PerformanceComparison.displayName = 'PerformanceComparison';

export default PerformanceComparison; 