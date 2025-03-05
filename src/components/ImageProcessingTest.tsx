import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as imageUtils from '../utils/imageUtils';
import * as imageService from '../utils/imageService';
import * as wasmImageUtils from '@/utils/wasmImageUtils';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getPerformanceLog, getOperationStats } from '@/utils/performanceMonitoring';

// Define processing options interface
interface ProcessingOptions {
  width: number;
  height: number;
  quality: number;
  format: 'jpeg' | 'png' | 'webp';
  maxSizeMB: number;
  grayscale: boolean;
  blur: number;
  crop: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}

// Define result object structure
interface ProcessingResult {
  id: string;
  name: string;
  originalUrl: string;
  processedUrl: string;
  originalSize: number;
  processedSize: number;
  processingTime: number;
  method: 'client' | 'server' | 'wasm';
  options: Partial<ProcessingOptions>;
  metadata?: imageUtils.ImageMetadata;
}

export default function ImageProcessingTest() {
  // File input reference
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
  const [originalMetadata, setOriginalMetadata] = useState<imageUtils.ImageMetadata | null>(null);
  
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
      const supported = wasmImageUtils.isWasmImageProcessingSupported();
      setWasmSupported(supported);
      
      if (supported) {
        try {
          const initialized = await wasmImageUtils.initWasmImageProcessing();
          setWasmInitialized(initialized);
          console.log('WebAssembly image processing initialized:', initialized);
        } catch (error) {
          console.error('Error initializing WebAssembly image processing:', error);
        }
      }
    };
    
    checkWasmSupport();
  }, []);

  // Handler for file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  // Extract metadata from the selected image
  const extractMetadata = async (file: File) => {
    setLoading(true);
    
    try {
      const metadata = await imageUtils.getImageMetadata(file);
      setOriginalMetadata(metadata);
      
      // Update options based on the image dimensions
      setOptions(prev => ({
        ...prev,
        width: metadata.width,
        height: metadata.height,
      }));
    } catch (error) {
      console.error('Error extracting metadata:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handler for option changes
  const handleOptionChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    setOptions(prev => ({
      ...prev,
      [name]: type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked 
        : type === 'number' 
          ? parseFloat(value) 
          : value,
    }));
  };

  // Process the image on the client side
  const processClientSide = async () => {
    if (!file) return;
    
    setLoading(true);
    
    try {
      const startTime = performance.now();
      
      // Process the image with selected options
      const processedBlob = await imageUtils.processImage(file, {
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
      const processingTime = endTime - startTime;
      
      // Create a URL for the processed image
      const processedUrl = URL.createObjectURL(processedBlob);
      
      // Add to results
      const result: ProcessingResult = {
        id: uuidv4(),
        name: `${file.name} (Client)`,
        originalUrl: previewUrl,
        processedUrl,
        originalSize: file.size,
        processedSize: processedBlob.size,
        processingTime,
        method: 'client',
        options: { ...options },
        metadata: originalMetadata || undefined,
      };
      
      setResults(prev => [result, ...prev]);
    } catch (error) {
      console.error('Error processing image client-side:', error);
      alert('Error processing image client-side. See console for details.');
    } finally {
      setLoading(false);
    }
  };

  // Process the image on the server side (simulation)
  const processServerSide = async () => {
    if (!file) return;
    
    setLoading(true);
    
    try {
      const startTime = performance.now();
      
      // Call the server-side processing service
      const response = await imageService.processImageRemote(file, {
        width: options.width,
        height: options.height,
        quality: options.quality,
        format: options.format,
        grayscale: options.grayscale,
        blur: options.blur > 0 ? options.blur : undefined,
        crop: options.crop || undefined,
      });
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      if (!response.success) {
        throw new Error(response.error || 'Unknown error during server-side processing');
      }
      
      // In a real implementation, the server would return the processed image
      // Since this is a simulation, we'll create a dummy result
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
      
      setResults(prev => [result, ...prev]);
      
      // Alert about the simulation
      alert('Note: Server-side processing is simulated. In a real implementation, this would call a server with Sharp installed.');
      
    } catch (error) {
      console.error('Error processing image server-side:', error);
      alert('Error processing image server-side. See console for details.');
    } finally {
      setLoading(false);
    }
  };

  const processWasmSide = async () => {
    if (!file || !wasmInitialized) return;
    
    setLoading(true);
    const startTime = performance.now();
    
    try {
      // Prepare result object
      const resultId = `wasm-${Date.now()}`;
      const resultName = `${file.name.split('.')[0]}-wasm`;
      
      // Process the image with WebAssembly
      let processedBlob: Blob;
      
      if (options.crop) {
        processedBlob = await wasmImageUtils.cropImageWasm(file, options.crop);
      } else if (options.grayscale) {
        processedBlob = await wasmImageUtils.grayscaleImageWasm(file);
      } else if (options.blur > 0) {
        processedBlob = await wasmImageUtils.blurImageWasm(file, options.blur);
      } else if (options.width && options.height) {
        processedBlob = await wasmImageUtils.resizeImageWasm(file, options.width, options.height);
      } else if (options.format) {
        processedBlob = await wasmImageUtils.convertImageFormatWasm(file, options.format, options.quality);
      } else {
        // Default to batch processing with all options
        processedBlob = await wasmImageUtils.batchProcessImageWasm(file, {
          resize: options.width ? { width: options.width, height: options.height } : undefined,
          format: options.format,
          compress: { quality: options.quality },
          grayscale: options.grayscale,
          blur: options.blur > 0 ? options.blur : undefined,
          crop: options.crop || undefined
        });
      }
      
      // Get metadata of processed image
      const metadata = await wasmImageUtils.getImageMetadataWasm(
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
  };
  
  const compareAllMethods = async () => {
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
  };

  // Handler for removing a result
  const removeResult = (id: string) => {
    setResults(prev => prev.filter(result => result.id !== id));
  };

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
          <div>
            <Label htmlFor="width">Width</Label>
            <Input
              type="number"
              name="width"
              value={options.width}
              onChange={handleOptionChange}
              className="max-w-md"
              min="1"
            />
          </div>
          
          <div>
            <Label htmlFor="height">Height</Label>
            <Input
              type="number"
              name="height"
              value={options.height}
              onChange={handleOptionChange}
              className="max-w-md"
              min="1"
            />
          </div>
          
          <div>
            <Label htmlFor="quality">Quality (1-100)</Label>
            <Input
              type="number"
              name="quality"
              value={options.quality}
              onChange={handleOptionChange}
              className="max-w-md"
              min="1"
              max="100"
            />
          </div>
          
          <div>
            <Label htmlFor="format">Format</Label>
            <Select 
              value={options.format} 
              onValueChange={(value) => handleOptionChange({ 
                target: { name: 'format', value } 
              } as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="jpeg">JPEG</SelectItem>
                <SelectItem value="png">PNG</SelectItem>
                <SelectItem value="webp">WebP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="maxSizeMB">Max Size (MB)</Label>
            <Input
              type="number"
              name="maxSizeMB"
              value={options.maxSizeMB}
              onChange={handleOptionChange}
              className="max-w-md"
              min="0.1"
              step="0.1"
            />
          </div>
          
          <div>
            <Label htmlFor="blur">Blur (0-10)</Label>
            <Input
              type="number"
              name="blur"
              value={options.blur}
              onChange={handleOptionChange}
              className="max-w-md"
              min="0"
              max="10"
              step="1"
            />
          </div>
          
          <div className="col-span-1 md:col-span-2">
            <Label htmlFor="grayscale">Grayscale</Label>
            <Checkbox
              id="grayscale"
              checked={options.grayscale}
              onCheckedChange={(value) => handleOptionChange({
                target: { name: 'grayscale', checked: value }
              } as any)}
            />
          </div>
          
          <div className="col-span-1 md:col-span-2">
            <Label htmlFor="crop">Crop</Label>
            <Input
              type="text"
              name="crop"
              value={options.crop ? `${options.crop.x},${options.crop.y},${options.crop.width},${options.crop.height}` : ''}
              onChange={(e) => {
                const [x, y, width, height] = e.target.value.split(',').map(Number);
                setOptions(prev => ({
                  ...prev,
                  crop: { x, y, width, height }
                }));
              }}
              className="max-w-md"
            />
          </div>
        </div>
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
            {results.map(result => (
              <Card key={result.id} className={
                result.method === 'client' ? 'border-blue-200' : 
                result.method === 'server' ? 'border-green-200' : 
                'border-purple-200'
              }>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>
                      {result.name}
                      <span className={
                        result.method === 'client' ? 'ml-2 text-blue-500 text-sm' : 
                        result.method === 'server' ? 'ml-2 text-green-500 text-sm' : 
                        'ml-2 text-purple-500 text-sm'
                      }>
                        ({result.method === 'client' ? 'Browser' : 
                          result.method === 'server' ? 'Server' : 
                          'WebAssembly'})
                      </span>
                    </span>
                    <Button 
                      className="h-9 px-2 py-0 rounded-md text-sm opacity-70 hover:opacity-100"
                      onClick={() => removeResult(result.id)}
                    >
                      Remove
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="comparison">
                    <TabsList className="mb-4">
                      <TabsTrigger value="comparison">Comparison</TabsTrigger>
                      <TabsTrigger value="details">Details</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="comparison">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="mb-2 font-medium">Original</h4>
                          <div className="relative bg-muted rounded-md overflow-hidden" style={{ height: '200px' }}>
                            <img 
                              src={result.originalUrl} 
                              alt="Original" 
                              className="object-contain w-full h-full"
                            />
                          </div>
                          <p className="mt-1 text-sm">
                            {(result.originalSize / 1024).toFixed(2)} KB
                          </p>
                        </div>
                        
                        <div>
                          <h4 className="mb-2 font-medium">Processed</h4>
                          <div className="relative bg-muted rounded-md overflow-hidden" style={{ height: '200px' }}>
                            <img 
                              src={result.processedUrl} 
                              alt="Processed" 
                              className="object-contain w-full h-full"
                            />
                          </div>
                          <p className="mt-1 text-sm">
                            {(result.processedSize / 1024).toFixed(2)} KB
                            {result.originalSize > result.processedSize && (
                              <span className="text-green-500 ml-1">
                                ({((1 - (result.processedSize / result.originalSize)) * 100).toFixed(0)}% smaller)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="details">
                      <div className="space-y-2 text-sm">
                        <p><strong>Processing Time:</strong> {result.processingTime.toFixed(2)} ms</p>
                        <p><strong>Size Reduction:</strong> {
                          ((1 - (result.processedSize / result.originalSize)) * 100).toFixed(2)}%
                        </p>
                        
                        {result.metadata && (
                          <>
                            <p><strong>Dimensions:</strong> {result.metadata.width} × {result.metadata.height}</p>
                            <p><strong>Format:</strong> {result.metadata.format}</p>
                          </>
                        )}
                        
                        <div className="mt-4">
                          <h4 className="font-medium mb-2">Applied Options:</h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {result.options.width && (
                              <li>Resize: {result.options.width} × {result.options.height || 'auto'}</li>
                            )}
                            {result.options.quality && (
                              <li>Quality: {result.options.quality}%</li>
                            )}
                            {result.options.format && (
                              <li>Format: {result.options.format.toUpperCase()}</li>
                            )}
                            {result.options.grayscale && (
                              <li>Grayscale: Enabled</li>
                            )}
                            {result.options.blur > 0 && (
                              <li>Blur: {result.options.blur}px</li>
                            )}
                            {result.options.crop && (
                              <li>Crop: {result.options.crop.width}×{result.options.crop.height} from ({result.options.crop.x},{result.options.crop.y})</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button 
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/90 h-9 px-4 py-2 rounded-md text-sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = result.processedUrl;
                      link.download = result.name;
                      link.click();
                    }}
                  >
                    Download
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Performance comparison */}
      {results.length > 0 && results.some(r => r.method === 'wasm') && (
        <div className="mt-10">
          <h2 className="text-xl font-semibold mb-4">Performance Comparison</h2>
          <div className="p-4 bg-muted rounded-md">
            <h3 className="font-medium mb-2">Processing Times:</h3>
            <div className="space-y-2">
              {['client', 'server', 'wasm'].map(method => {
                const methodResults = results.filter(r => r.method === method);
                if (methodResults.length === 0) return null;
                
                const avgTime = methodResults.reduce((sum, r) => sum + r.processingTime, 0) / methodResults.length;
                const fastestMethod = ['client', 'server', 'wasm']
                  .map(m => {
                    const mrs = results.filter(r => r.method === m);
                    if (mrs.length === 0) return { method: m, time: Infinity };
                    return { 
                      method: m, 
                      time: mrs.reduce((sum, r) => sum + r.processingTime, 0) / mrs.length 
                    };
                  })
                  .sort((a, b) => a.time - b.time)[0].method;
                
                const methodName = method === 'client' ? 'Browser (Canvas API)' : 
                                 method === 'server' ? 'Server (Simulated Sharp API)' : 
                                 'WebAssembly (Sharp WASM)';
                
                return (
                  <div key={method} className="flex items-center">
                    <div className="w-40 font-medium">{methodName}:</div>
                    <div className="flex-1">
                      <div className="bg-gray-200 h-4 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${
                            method === 'client' ? 'bg-blue-500' : 
                            method === 'server' ? 'bg-green-500' : 
                            'bg-purple-500'
                          } ${method === fastestMethod ? 'animate-pulse' : ''}`}
                          style={{ width: `${Math.min(100, (avgTime / 500) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="w-24 text-right">{avgTime.toFixed(2)} ms</div>
                    {method === fastestMethod && (
                      <div className="w-24 text-right text-green-500 font-medium">Fastest!</div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <p className="mt-4 text-sm text-muted-foreground">
              Note: These comparisons are based on the operations performed during this session.
              For more accurate benchmarking, try processing the same image multiple times with each method.
            </p>
          </div>
        </div>
      )}
    </div>
  );
} 