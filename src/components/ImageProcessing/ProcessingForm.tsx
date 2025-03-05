import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProcessingOptions } from './types';

interface ProcessingFormProps {
  options: ProcessingOptions;
  onChange: (options: ProcessingOptions) => void;
}

const ProcessingForm = React.memo(({ options, onChange }: ProcessingFormProps) => {
  // Handle input changes for most input types
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    // Handle different input types appropriately
    if (type === 'checkbox') {
      onChange({
        ...options,
        [name]: checked
      });
    } else if (type === 'number') {
      onChange({
        ...options,
        [name]: parseFloat(value) || 0
      });
    } else {
      onChange({
        ...options,
        [name]: value
      });
    }
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    onChange({
      ...options,
      [name]: value
    });
  };

  // Handle crop input changes
  const handleCropChange = (cropText: string) => {
    try {
      const [x, y, width, height] = cropText.split(',').map(Number);
      if (!isNaN(x) && !isNaN(y) && !isNaN(width) && !isNaN(height)) {
        onChange({
          ...options,
          crop: { x, y, width, height }
        });
      } else {
        // If parsing fails, set crop to null
        onChange({
          ...options,
          crop: null
        });
      }
    } catch (error) {
      // If there's an error, set crop to null
      onChange({
        ...options,
        crop: null
      });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
      <div>
        <Label htmlFor="width">Width</Label>
        <Input
          id="width"
          type="number"
          name="width"
          value={options.width}
          onChange={handleInputChange}
          className="max-w-md"
          min="1"
        />
      </div>
      
      <div>
        <Label htmlFor="height">Height</Label>
        <Input
          id="height"
          type="number"
          name="height"
          value={options.height}
          onChange={handleInputChange}
          className="max-w-md"
          min="1"
        />
      </div>
      
      <div>
        <Label htmlFor="quality">Quality (1-100)</Label>
        <Input
          id="quality"
          type="number"
          name="quality"
          value={options.quality}
          onChange={handleInputChange}
          className="max-w-md"
          min="1"
          max="100"
        />
      </div>
      
      <div>
        <Label htmlFor="format">Format</Label>
        <Select 
          value={options.format} 
          onValueChange={(value) => handleSelectChange('format', value)}
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
          id="maxSizeMB"
          type="number"
          name="maxSizeMB"
          value={options.maxSizeMB}
          onChange={handleInputChange}
          className="max-w-md"
          min="0.1"
          step="0.1"
        />
      </div>
      
      <div>
        <Label htmlFor="blur">Blur (0-10)</Label>
        <Input
          id="blur"
          type="number"
          name="blur"
          value={options.blur}
          onChange={handleInputChange}
          className="max-w-md"
          min="0"
          max="10"
          step="0.5"
        />
      </div>
      
      <div className="col-span-1 md:col-span-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="grayscale"
            checked={options.grayscale}
            onCheckedChange={(checked) => {
              onChange({
                ...options,
                grayscale: !!checked
              });
            }}
          />
          <Label htmlFor="grayscale">Grayscale</Label>
        </div>
      </div>
      
      <div className="col-span-1 md:col-span-2">
        <Label htmlFor="crop">Crop (x,y,width,height)</Label>
        <Input
          id="crop"
          type="text"
          value={options.crop ? `${options.crop.x},${options.crop.y},${options.crop.width},${options.crop.height}` : ''}
          onChange={(e) => handleCropChange(e.target.value)}
          placeholder="e.g., 0,0,100,100"
          className="max-w-md"
        />
      </div>
    </div>
  );
});

// Display name for debugging
ProcessingForm.displayName = 'ProcessingForm';

export default ProcessingForm; 