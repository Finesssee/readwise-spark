import React, { useState, useRef } from 'react';
import * as imageUtils from '../utils/imageUtils';
import * as imageService from '../utils/imageService';
import { v4 as uuidv4 } from 'uuid';

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
  method: 'client' | 'server';
  options: Partial<ProcessingOptions>;
  metadata?: imageUtils.ImageMetadata;
}

export default function ImageProcessingTest() {
  // File input reference
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for the selected image
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
  const [metadata, setMetadata] = useState<imageUtils.ImageMetadata | null>(null);
  
  // State for processing results
  const [results, setResults] = useState<ProcessingResult[]>([]);
  
  // State for loading indicators
  const [isLoading, setIsLoading] = useState<{
    client: boolean;
    server: boolean;
    metadata: boolean;
  }>({
    client: false,
    server: false,
    metadata: false,
  });

  // Handler for file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setSelectedFile(file);
    
    // Create a preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    // Reset metadata
    setMetadata(null);
    
    // Extract image metadata
    await extractMetadata(file);
  };

  // Extract metadata from the selected image
  const extractMetadata = async (file: File) => {
    setIsLoading({ ...isLoading, metadata: true });
    
    try {
      const metadata = await imageUtils.getImageMetadata(file);
      setMetadata(metadata);
      
      // Update options based on the image dimensions
      setOptions(prev => ({
        ...prev,
        width: metadata.width,
        height: metadata.height,
      }));
    } catch (error) {
      console.error('Error extracting metadata:', error);
    } finally {
      setIsLoading({ ...isLoading, metadata: false });
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
    if (!selectedFile) return;
    
    setIsLoading({ ...isLoading, client: true });
    
    try {
      const startTime = performance.now();
      
      // Process the image with selected options
      const processedBlob = await imageUtils.processImage(selectedFile, {
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
        name: `${selectedFile.name} (Client)`,
        originalUrl: previewUrl,
        processedUrl,
        originalSize: selectedFile.size,
        processedSize: processedBlob.size,
        processingTime,
        method: 'client',
        options: { ...options },
        metadata: metadata || undefined,
      };
      
      setResults(prev => [result, ...prev]);
    } catch (error) {
      console.error('Error processing image client-side:', error);
      alert('Error processing image client-side. See console for details.');
    } finally {
      setIsLoading({ ...isLoading, client: false });
    }
  };

  // Process the image on the server side (simulation)
  const processServerSide = async () => {
    if (!selectedFile) return;
    
    setIsLoading({ ...isLoading, server: true });
    
    try {
      const startTime = performance.now();
      
      // Call the server-side processing service
      const response = await imageService.processImageRemote(selectedFile, {
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
        name: `${selectedFile.name} (Server)`,
        originalUrl: previewUrl,
        // In a real implementation, this would be response.imageUrl
        // For demo purposes, we'll use the original image
        processedUrl: previewUrl,
        originalSize: selectedFile.size,
        // Simulate a smaller size
        processedSize: Math.round(selectedFile.size * 0.7),
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
      setIsLoading({ ...isLoading, server: false });
    }
  };

  // Handler for removing a result
  const removeResult = (id: string) => {
    setResults(prev => prev.filter(result => result.id !== id));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Image Processing Test</h1>
      
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[300px]">
            <h2 className="text-xl font-semibold mb-2">1. Select Image</h2>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="mb-4 block w-full text-sm text-gray-900 border border-gray-300 rounded-lg p-2"
            />
            
            {previewUrl && (
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">Preview</h3>
                <div className="relative border border-gray-300 rounded-lg overflow-hidden" style={{ maxWidth: '100%', maxHeight: '300px' }}>
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-w-full max-h-[300px] object-contain"
                  />
                </div>
              </div>
            )}
            
            {isLoading.metadata ? (
              <div className="mt-4">Loading metadata...</div>
            ) : metadata ? (
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">Image Metadata</h3>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <p>Dimensions: {metadata.width} x {metadata.height}</p>
                  <p>Aspect Ratio: {metadata.aspectRatio.toFixed(2)}</p>
                  {metadata.format && <p>Format: {metadata.format}</p>}
                  {metadata.size && <p>Size: {(metadata.size / 1024).toFixed(2)} KB</p>}
                </div>
              </div>
            ) : null}
          </div>
          
          <div className="flex-1 min-w-[300px]">
            <h2 className="text-xl font-semibold mb-2">2. Processing Options</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Width</label>
                <input
                  type="number"
                  name="width"
                  value={options.width}
                  onChange={handleOptionChange}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Height</label>
                <input
                  type="number"
                  name="height"
                  value={options.height}
                  onChange={handleOptionChange}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Quality (1-100)</label>
                <input
                  type="number"
                  name="quality"
                  value={options.quality}
                  onChange={handleOptionChange}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  min="1"
                  max="100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Format</label>
                <select
                  name="format"
                  value={options.format}
                  onChange={handleOptionChange}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value="jpeg">JPEG</option>
                  <option value="png">PNG</option>
                  <option value="webp">WebP</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Max Size (MB)</label>
                <input
                  type="number"
                  name="maxSizeMB"
                  value={options.maxSizeMB}
                  onChange={handleOptionChange}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  min="0.1"
                  step="0.1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Blur (0-10)</label>
                <input
                  type="number"
                  name="blur"
                  value={options.blur}
                  onChange={handleOptionChange}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  min="0"
                  max="10"
                  step="1"
                />
              </div>
              
              <div className="col-span-1 md:col-span-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="grayscale"
                    checked={options.grayscale}
                    onChange={handleOptionChange}
                    className="rounded"
                  />
                  <span>Grayscale</span>
                </label>
              </div>
            </div>
            
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={processClientSide}
                disabled={!selectedFile || isLoading.client}
                className={`px-4 py-2 rounded-lg ${
                  !selectedFile || isLoading.client
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {isLoading.client ? 'Processing...' : 'Process (Client-side)'}
              </button>
              
              <button
                onClick={processServerSide}
                disabled={!selectedFile || isLoading.server}
                className={`px-4 py-2 rounded-lg ${
                  !selectedFile || isLoading.server
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {isLoading.server ? 'Processing...' : 'Process (Server-side Simulation)'}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">3. Processing Results</h2>
        
        {results.length === 0 ? (
          <div className="p-4 bg-gray-100 rounded-lg text-center">
            No processing results yet. Select an image and process it to see results here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {results.map(result => (
              <div key={result.id} className="border rounded-lg overflow-hidden shadow-md">
                <div className="bg-gray-100 px-4 py-2 flex justify-between items-center">
                  <h3 className="font-medium truncate">{result.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    result.method === 'client'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {result.method === 'client' ? 'Client' : 'Server'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 p-4">
                  <div>
                    <p className="text-sm font-medium mb-1 text-center">Original</p>
                    <div className="border border-gray-200 rounded-lg overflow-hidden h-40">
                      <img
                        src={result.originalUrl}
                        alt="Original"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="text-xs text-center mt-1">
                      {(result.originalSize / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium mb-1 text-center">Processed</p>
                    <div className="border border-gray-200 rounded-lg overflow-hidden h-40">
                      <img
                        src={result.processedUrl}
                        alt="Processed"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="text-xs text-center mt-1">
                      {(result.processedSize / 1024).toFixed(2)} KB
                      {' '}
                      ({Math.round((1 - result.processedSize / result.originalSize) * 100)}% reduction)
                    </p>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-4 py-3 border-t">
                  <div className="grid grid-cols-2 gap-4 text-xs mb-2">
                    <div>
                      <p><span className="font-medium">Processing Time:</span> {result.processingTime.toFixed(2)} ms</p>
                      <p><span className="font-medium">Format:</span> {result.options.format}</p>
                      <p><span className="font-medium">Quality:</span> {result.options.quality}%</p>
                    </div>
                    <div>
                      <p><span className="font-medium">Dimensions:</span> {result.options.width} x {result.options.height}</p>
                      <p><span className="font-medium">Grayscale:</span> {result.options.grayscale ? 'Yes' : 'No'}</p>
                      <p><span className="font-medium">Blur:</span> {result.options.blur || 'None'}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      onClick={() => removeResult(result.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-2">About Image Processing</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Client-side Processing</h3>
            <p className="text-sm mb-2">
              Uses the browser's Canvas API and the browser-image-compression library to process images
              directly in the browser. This approach:
            </p>
            <ul className="list-disc pl-5 text-sm">
              <li>Works entirely in the browser with no server required</li>
              <li>Avoids uploading images to a server (better for privacy)</li>
              <li>Limited by browser capabilities and performance</li>
              <li>May be slower for large images or complex operations</li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">Server-side Processing (Simulated)</h3>
            <p className="text-sm mb-2">
              In a real implementation, this would use Sharp, a high-performance Node.js image processing library.
              This approach:
            </p>
            <ul className="list-disc pl-5 text-sm">
              <li>Offers significantly better performance than browser-based processing</li>
              <li>Provides more advanced capabilities (like AVIF format support)</li>
              <li>Reduces client-side resource usage</li>
              <li>Requires server infrastructure and image upload</li>
            </ul>
            <p className="text-sm mt-2 italic">
              Note: Server-side processing is simulated in this demo. Actual performance would be better.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 