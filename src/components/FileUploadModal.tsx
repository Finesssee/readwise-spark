import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, FileType } from 'lucide-react';
import { processUploadedFile, UploadResult } from '@/utils/uploadUtils';
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

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  // Process uploaded files
  const processFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    
    try {
      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const result = await processUploadedFile(file);
        
        // Show toast notification for each file
        addToast({
          title: result.status === 'success' ? 'Upload Successful' : 'Upload Failed',
          description: result.message,
          type: result.status === 'success' ? 'success' : 'error',
          duration: 5000
        });
      }
      
      // Close modal after all files are processed
      onClose();
    } catch (error) {
      console.error('Upload error:', error);
      addToast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        type: 'error',
        duration: 5000
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const { files } = e.dataTransfer;
    processFiles(files);
  }, []);

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;
    processFiles(files);
  };

  // Handle button click to open file dialog
  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-background rounded-lg shadow-lg p-6 hardware-accelerated">
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
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleButtonClick}
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
            accept=".pdf,.epub,.html,.txt,.md"
            disabled={isUploading}
          />
        </div>
        
        {/* Upload Status */}
        {isUploading && (
          <div className="mt-4 p-4 bg-secondary/50 rounded-lg">
            <p className="text-center">Uploading files...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploadModal; 