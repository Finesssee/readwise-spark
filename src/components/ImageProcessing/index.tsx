import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getPerformanceLog, getOperationStats } from '@/utils/performanceMonitoring';

// Lazy load heavy components
const ProcessingForm = lazy(() => import('./ProcessingForm'));
const ResultCard = lazy(() => import('./ResultCard'));
const PerformanceComparison = lazy(() => import('./PerformanceComparison'));

// Lazy load the image processing utilities to reduce initial load time
const imageUtils = import('@/utils/imageUtils');
const imageService = import('@/utils/imageService');
const wasmImageUtils = import('@/utils/wasmImageUtils');

// Import types
import { ProcessingOptions, ProcessingResult } from './types';

export default function ImageProcessingTest() {
  // State for the selected image
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  
  // State for processing options
  const [options, setOptions] = useState<ProcessingOptions>({
    width: 800,
    height: 600,
    quality: 80,
    format: 'jpeg',
    maxSizeMB: 1,
    grayscale: false,
    blur: 0,
    crop: null,
  });
  
  // State for image metadata
  const [originalMetadata, setOriginalMetadata] = useState<any>(null);
  
  // State for processing results
  const [results, setResults] = useState<ProcessingResult[]>([]);
  
  // State for loading indicators
  const [loading, setLoading] = useState(false);
  
  // State for WebAssembly support
  const [wasmSupported, setWasmSupported] = useState(false);
  const [wasmInitialized, setWasmInitialized] = useState(false);

  // Initialize WebAssembly support check
  useEffect(() => {
    const checkWasmSupport = async () => {
      const utils = await wasmImageUtils;
      const supported = utils.isWasmImageProcessingSupported();
      setWasmSupported(supported);
      
      if (supported) {
        try {
          const initialized = await utils.initWasmImageProcessing();
          setWasmInitialized(initialized);
          console.log('WebAssembly image processing initialized:', initialized);
        } catch (error) {
          console.error('Error initializing WebAssembly image processing:', error);
        }
      }
    };
    
    checkWasmSupport();
  }, []);

  // Handler for file selection - wrapped in useCallback to prevent unnecessary re-renders
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setFile(file);
    
    // Create a preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    // Reset metadata
    setOriginalMetadata(null);
    
    // Extract image metadata
    await extractMetadata(file);
  }, []);

  // Extract metadata from the selected image
  const extractMetadata = useCallback(async (file: File) => {
    setLoading(true);
    
    try {
      const utils = await imageUtils;
      const metadata = await utils.getImageMetadata(file);
      setOriginalMetadata(metadata);
      
      // Update options based on the image dimensions
      setOptions(prevOptions => ({
        ...prevOptions,
        width: metadata.width > 1600 ? 1600 : metadata.width,
        height: metadata.height > 1200 ? 1200 : metadata.height,
      }));
    } catch (error) {
      console.error('Error extracting metadata:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handler for processing options change
  const handleOptionsChange = useCallback((newOptions: ProcessingOptions) => {
    setOptions(newOptions);
  }, []);

  // Process the image on the client side
  const processClientSide = useCallback(async () => {
    if (!file) return;
    
    setLoading(true);
    
    try {
      const startTime = performance.now();
      const utils = await imageUtils;
      
      // Process the image with selected options
      const processedBlob = await utils.processImage(file, {
        width: options.width,
        height: options.height,
        quality: options.quality,
        format: options.format,
        maxSizeMB: options.maxSizeMB,
        grayscale: options.grayscale,
        blur: options.blur > 0 ? options.blur : undefined,
        crop: options.crop || undefined,
      });
      
      // Get metadata of processed image
      const processedFile = new File([processedBlob], `processed-${file.name}`, {
        type: processedBlob.type,
      });
      
      const metadata = await utils.getImageMetadata(processedFile);
      
      // Create result URLs
      const originalUrl = URL.createObjectURL(file);
      const processedUrl = URL.createObjectURL(processedBlob);
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      // Create result object
      const result: ProcessingResult = {
        id: uuidv4(),
        name: `${file.name} (Client)`,
        originalUrl,
        processedUrl,
        originalSize: file.size,
        processedSize: processedBlob.size,
        processingTime,
        method: 'client',
        options: { ...options },
        metadata,
      };
      
      // Update results state
      setResults(prev => [result, ...prev]);
      
      // Log performance details
      console.log(`Client-side processing completed in ${processingTime.toFixed(2)}ms`);
      console.log(`Size reduction: ${((1 - (processedBlob.size / file.size)) * 100).toFixed(2)}%`);
    } catch (error) {
      console.error('Error processing image client-side:', error);
    } finally {
      setLoading(false);
    }
  }, [file, options]);

  // Process the image on the server side (simulation)
  const processServerSide = useCallback(async () => {
    if (!file) return;
    
    setLoading(true);
    
    try {
      const startTime = performance.now();
      const service = await imageService;
      
      // Call the server-side processing service
      const response = await service.processImageRemote(file, {
        width: options.width,
        height: options.height,
        quality: options.quality,
        format: options.format,
        maxSizeMB: options.maxSizeMB,
        grayscale: options.grayscale,
        blur: options.blur > 0 ? options.blur : undefined,
        crop: options.crop || undefined,
      });
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // In a real implementation, we would use the actual processed image from the server
      // For demo purposes, we'll use a mock response
      
      // Create result object
      const result: ProcessingResult = {
        id: uuidv4(),
        name: `${file.name} (Server)`,
        originalUrl: previewUrl,
        // In a real implementation, this would be response.imageUrl
        // For demo purposes, we'll use the original image
        processedUrl: previewUrl,
        originalSize: file.size,
        // Simulate a smaller size
        processedSize: Math.round(file.size * 0.7),
        processingTime: response.processingTime || totalTime,
        method: 'server',
        options: { ...options },
        metadata: response.metadata,
      };
      
      // Update results state
      setResults(prev => [result, ...prev]);
      
      // Log performance details
      console.log(`Server-side processing completed in ${totalTime.toFixed(2)}ms`);
    } catch (error) {
      console.error('Error processing image server-side:', error);
    } finally {
      setLoading(false);
    }
  }, [file, options, previewUrl]);
  
  // Process with WebAssembly
  const processWasmSide = useCallback(async () => {
    if (!file || !wasmInitialized) return;
    
    setLoading(true);
    const startTime = performance.now();
    
    try {
      const utils = await wasmImageUtils;
      
      // Prepare result object
      const resultId = `wasm-${Date.now()}`;
      const resultName = `${file.name.split('.')[0]}-wasm`;
      
      // Process the image with WebAssembly
      let processedBlob: Blob;
      
      if (options.crop) {
        processedBlob = await utils.cropImageWasm(file, options.crop);
      } else if (options.grayscale) {
        processedBlob = await utils.grayscaleImageWasm(file);
      } else if (options.blur > 0) {
        processedBlob = await utils.blurImageWasm(file, options.blur);
      } else if (options.width && options.height) {
        processedBlob = await utils.resizeImageWasm(file, options.width, options.height);
      } else if (options.format) {
        processedBlob = await utils.convertImageFormatWasm(file, options.format, options.quality);
      } else {
        // Default to batch processing with all options
        processedBlob = await utils.batchProcessImageWasm(file, {
          resize: options.width ? { width: options.width, height: options.height } : undefined,
          format: options.format,
          compress: { quality: options.quality },
          grayscale: options.grayscale,
          blur: options.blur > 0 ? options.blur : undefined,
          crop: options.crop || undefined
        });
      }
      
      // Get metadata of processed image
      const metadata = await utils.getImageMetadataWasm(
        new File([processedBlob], resultName, { type: processedBlob.type })
      );
      
      // Create result URLs
      const originalUrl = URL.createObjectURL(file);
      const processedUrl = URL.createObjectURL(processedBlob);
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      // Create result object
      const result: ProcessingResult = {
        id: resultId,
        name: resultName,
        originalUrl,
        processedUrl,
        originalSize: file.size,
        processedSize: processedBlob.size,
        processingTime,
        method: 'wasm',
        options: { ...options },
        metadata
      };
      
      // Update results state
      setResults(prev => [result, ...prev]);
      
      // Log performance details
      console.log(`WebAssembly processing completed in ${processingTime.toFixed(2)}ms`);
      console.log(`Size reduction: ${((1 - (processedBlob.size / file.size)) * 100).toFixed(2)}%`);
    } catch (error) {
      console.error('Error processing image with WebAssembly:', error);
    } finally {
      setLoading(false);
    }
  }, [file, options, wasmInitialized]);
  
  // Compare all methods
  const compareAllMethods = useCallback(async () => {
    if (!file) return;
    
    setLoading(true);
    
    try {
      // Process with all three methods
      await processClientSide();
      
      // Short delay to avoid UI freezing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await processServerSide();
      
      // Only process with WebAssembly if it's available and initialized
      if (wasmSupported && wasmInitialized) {
        await new Promise(resolve => setTimeout(resolve, 100));
        await processWasmSide();
      }
      
      // Get performance statistics
      const stats = getPerformanceLog();
      console.log('Performance comparison:', stats);
      
      // Display comparison in console
      const clientStats = getOperationStats('imageUtils:process');
      const serverStats = getOperationStats('imageService:process');
      const wasmStats = getOperationStats('wasmImage:process');
      
      console.table({
        'Client-side': {
          avgTime: clientStats?.averageDuration || 0,
          count: clientStats?.count || 0
        },
        'Server-side': {
          avgTime: serverStats?.averageDuration || 0,
          count: serverStats?.count || 0
        },
        'WebAssembly': {
          avgTime: wasmStats?.averageDuration || 0,
          count: wasmStats?.count || 0
        }
      });
    } catch (error) {
      console.error('Error comparing processing methods:', error);
    } finally {
      setLoading(false);
    }
  }, [file, processClientSide, processServerSide, processWasmSide, wasmInitialized, wasmSupported]);

  // Remove a result from the list
  const removeResult = useCallback((id: string) => {
    setResults(prev => prev.filter(result => result.id !== id));
  }, []);

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Image Processing Test</h1>
      
      {/* File Selection */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">1. Select an Image</h2>
        <Input 
          type="file" 
          accept="image/*"
          onChange={handleFileSelect}
          className="max-w-md"
        />
        
        {file && originalMetadata && (
          <div className="mt-4 p-4 bg-muted rounded-md max-w-md">
            <h3 className="font-medium mb-2">Original Image:</h3>
            <p>Dimensions: {originalMetadata.width} × {originalMetadata.height}</p>
            <p>Size: {(file.size / 1024).toFixed(2)} KB</p>
            <p>Format: {file.type.split('/')[1]}</p>
          </div>
        )}
      </div>
      
      {/* Processing Options */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">2. Configure Options</h2>
        <Suspense fallback={<div>Loading options form...</div>}>
          <ProcessingForm 
            options={options}
            onChange={handleOptionsChange}
          />
        </Suspense>
      </div>
      
      {/* Processing Buttons */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">3. Process Image</h2>
        <div className="flex flex-wrap gap-4">
          <Button 
            onClick={processClientSide} 
            disabled={!file || loading}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Process Client-side
          </Button>
          
          <Button 
            onClick={processServerSide}
            disabled={!file || loading}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
          >
            Process Server-side
          </Button>
          
          <Button 
            onClick={processWasmSide}
            disabled={!file || loading || !wasmSupported || !wasmInitialized}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            Process with WebAssembly
          </Button>
          
          <Button 
            onClick={compareAllMethods}
            disabled={!file || loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Compare All Methods
          </Button>
        </div>
        
        {!wasmSupported && (
          <p className="mt-2 text-red-500">WebAssembly is not supported in your browser.</p>
        )}
        
        {wasmSupported && !wasmInitialized && (
          <p className="mt-2 text-yellow-500">WebAssembly is supported but initialization failed.</p>
        )}
        
        {wasmSupported && wasmInitialized && (
          <p className="mt-2 text-green-500">WebAssembly is initialized and ready.</p>
        )}
      </div>
      
      {/* Results */}
      <div>
        <h2 className="text-xl font-semibold mb-4">4. Results</h2>
        
        {results.length === 0 ? (
          <p className="text-muted-foreground">No results yet. Process an image to see results.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Suspense fallback={<div>Loading results...</div>}>
              {results.map(result => (
                <ResultCard 
                  key={result.id}
                  result={result}
                  onRemove={removeResult}
                />
              ))}
            </Suspense>
          </div>
        )}
      </div>
      
      {/* Performance comparison */}
      <Suspense fallback={<div>Loading performance comparison...</div>}>
        <PerformanceComparison results={results} />
      </Suspense>
    </div>
  );
} 