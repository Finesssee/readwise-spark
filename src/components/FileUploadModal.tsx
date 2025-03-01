import React, { useState, useRef } from 'react';
import { X, Upload } from 'lucide-react';
import { processUploadedFile } from '@/utils/uploadUtils';
import { useToast } from '@/components/ui/toast';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FileUploadModal: React.FC<FileUploadModalProps> = ({ isOpen, onClose }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  // Basic drag event handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  // Process the files
  const handleFiles = async (files: FileList) => {
    console.log('Processing files:', Array.from(files).map(f => f.name).join(', '));
    setIsUploading(true);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Process this file
        const result = await processUploadedFile(file);
        
        // Show toast notification
        addToast({
          title: result.status === 'success' ? 'Upload Success' : 'Upload Failed',
          description: result.message,
          type: result.status === 'success' ? 'success' : 'error'
        });
      }
      
      // Only close if we're done
      onClose();
    } catch (error) {
      console.error('Error during upload:', error);
      
      addToast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Error uploading file',
        type: 'error'
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Open the file browser
  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Create a test file for debugging
  const handleTestFileClick = () => {
    const testContent = "This is a test document for upload debugging.";
    const blob = new Blob([testContent], { type: 'text/plain' });
    const file = new File([blob], "test-document.txt", { type: 'text/plain' });
    
    // Create a FileList-like object
    const fileList = {
      0: file,
      length: 1,
      item: (index: number) => (index === 0 ? file : null)
    } as unknown as FileList;
    
    handleFiles(fileList);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-background rounded-lg shadow-lg p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-full hover:bg-secondary/50 transition-colors"
          disabled={isUploading}
        >
          <X className="h-5 w-5" />
        </button>
        
        <h2 className="text-xl font-semibold mb-4">Upload Files</h2>
        
        {/* Drag & Drop Area */}
        <div
          className={`mt-4 p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors duration-200 ${
            isDragging ? 'border-primary bg-primary/5' : 'border-border'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
        >
          <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium">Drag and drop files here</p>
          <p className="text-muted-foreground mt-2">or click to browse</p>
          <p className="text-xs text-muted-foreground mt-4">
            Supported formats: PDF, EPUB, HTML, TXT, MD
          </p>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            className="hidden"
            multiple
            accept=".pdf,.epub,.html,.htm,.txt,.md"
          />
        </div>
        
        {/* Upload Status */}
        {isUploading && (
          <div className="mt-4 p-4 bg-secondary/50 rounded-lg">
            <p className="text-center">Uploading files...</p>
          </div>
        )}
        
        {/* Debug buttons */}
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm"
            onClick={handleTestFileClick}
          >
            Upload Test File
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileUploadModal; 