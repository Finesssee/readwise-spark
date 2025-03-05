import React from 'react';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ProcessingResult } from './types';

interface ResultCardProps {
  result: ProcessingResult;
  onRemove: (id: string) => void;
}

// Use React.memo to prevent unnecessary re-renders
const ResultCard = React.memo(({ result, onRemove }: ResultCardProps) => {
  // Determine the border color based on the processing method
  const getBorderClass = (): string => {
    switch (result.method) {
      case 'client':
        return 'border-blue-200';
      case 'server':
        return 'border-green-200';
      case 'wasm':
        return 'border-purple-200';
      default:
        return '';
    }
  };

  // Get the method display name
  const getMethodName = (): string => {
    switch (result.method) {
      case 'client':
        return 'Browser';
      case 'server':
        return 'Server';
      case 'wasm':
        return 'WebAssembly';
      default:
        return result.method;
    }
  };

  // Get the color of the method label
  const getMethodColor = (): string => {
    switch (result.method) {
      case 'client':
        return 'text-blue-500';
      case 'server':
        return 'text-green-500';
      case 'wasm':
        return 'text-purple-500';
      default:
        return '';
    }
  };

  // Handle download click
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = result.processedUrl;
    link.download = result.name;
    link.click();
  };

  return (
    <Card className={getBorderClass()}>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>
            {result.name}
            <span className={`ml-2 text-sm ${getMethodColor()}`}>
              ({getMethodName()})
            </span>
          </span>
          <Button 
            className="h-9 px-2 py-0 rounded-md text-sm opacity-70 hover:opacity-100"
            onClick={() => onRemove(result.id)}
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
          onClick={handleDownload}
        >
          Download
        </Button>
      </CardFooter>
    </Card>
  );
});

// Display name for debugging
ResultCard.displayName = 'ResultCard';

export default ResultCard; 