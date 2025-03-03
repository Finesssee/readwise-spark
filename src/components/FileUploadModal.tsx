import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Upload, AlertCircle, Info } from 'lucide-react';
import { processUploadedFile } from '@/utils/uploadUtils';
import { useToast } from '@/components/ui/toast';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Create a pre-validation function for files
const validateFileBeforeUpload = (file: File): { isValid: boolean; message?: string } => {
  // Check if file is empty
  if (file.size === 0) {
    return { isValid: false, message: 'File is empty.' };
  }
  
  // Check file size (800MB)
  const MAX_FILE_SIZE = 800 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    return { isValid: false, message: 'File too large. Maximum size is 800MB.' };
  }
  
  return { isValid: true };
};

const FileUploadModal: React.FC<FileUploadModalProps> = React.memo(({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{message: string, type: 'info' | 'error' | 'success'} | null>(null);
  const [bytesProcessed, setBytesProcessed] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  // Optimized drag event handlers with useCallback
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  // Handle file input change with useCallback
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  }, []);

  // Process the files
  const handleFiles = useCallback(async (files: FileList) => {
    // Reset states
    setIsUploading(true);
    setUploadStatus({message: 'Validating file...', type: 'info'});
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Fast pre-validation before heavy processing
        const validation = validateFileBeforeUpload(file);
        if (!validation.isValid) {
          setUploadStatus({message: validation.message || 'Invalid file', type: 'error'});
          addToast({
            title: 'Validation Failed',
            description: validation.message || 'Invalid file',
            type: 'error'
          });
          setIsUploading(false);
          return;
        }
        
        // Show more granular processing feedback
        setTotalBytes(file.size);
        setUploadStatus({message: 'Processing file...', type: 'info'});
        
        // Update progress simulation for better UX (makes it feel faster)
        const updateProgress = () => {
          if (!isUploading) return;
          setBytesProcessed(prev => {
            const increment = Math.min(file.size * 0.1, file.size - prev);
            const newValue = prev + increment;
            if (newValue < file.size) {
              setTimeout(updateProgress, 100);
            }
            return newValue;
          });
        };
        
        // Start progress updates
        updateProgress();
        
        // Process this file - optimized for faster navigation to reader
        const result = await processUploadedFile(file);
        
        // Update status
        setUploadStatus({
          message: result.status === 'success' ? 'Opening file...' : result.message,
          type: result.status === 'success' ? 'success' : 'error'
        });
        
        // Complete progress
        setBytesProcessed(file.size);
        
        // Show toast notification
        addToast({
          title: result.status === 'success' ? 'Upload Success' : 'Upload Failed',
          description: result.status === 'success' ? 'Opening file...' : result.message,
          type: result.status === 'success' ? 'success' : 'error'
        });
        
        // If successful, close immediately and navigate to reader view
        if (result.status === 'success' && result.readerId) {
          onClose();
          
          // Immediately navigate to the reader view with the new article ID
          navigate(`/reader/${result.readerId}`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error uploading file';
      setUploadStatus({message: errorMessage, type: 'error'});
      
      addToast({
        title: 'Upload Failed',
        description: errorMessage,
        type: 'error'
      });
    } finally {
      setIsUploading(false);
    }
  }, [addToast, onClose, navigate]);

  // Open the file browser (memoized)
  const handleBrowseClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  // Create a test file for debugging
  const handleTestFileClick = useCallback(() => {
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
  }, [handleFiles]);

  // Reset the upload status
  const resetStatus = useCallback(() => {
    setUploadStatus(null);
    setBytesProcessed(0);
    setTotalBytes(0);
  }, []);

  // Don't render if not open
  if (!isOpen) return null;

  // Calculate upload progress percentage
  const uploadProgress = useMemo(() => {
    if (totalBytes === 0) return 0;
    return Math.min(100, Math.round((bytesProcessed / totalBytes) * 100));
  }, [bytesProcessed, totalBytes]);

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
        
        {/* Drag & Drop Area - simplified while uploading */}
        {!isUploading ? (
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
        ) : (
          <div className="mt-4 p-8 border-2 border-dashed rounded-lg bg-background text-center">
            <div className="space-y-3">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
              <p className="text-lg font-medium">{uploadStatus?.message || 'Processing...'}</p>
              
              {/* Progress bar */}
              <div className="w-full bg-secondary rounded-full h-2.5 mt-2">
                <div 
                  className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-in-out" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-muted-foreground">{uploadProgress}% complete</p>
            </div>
          </div>
        )}
        
        {/* Upload Status - only show when not uploading */}
        {!isUploading && uploadStatus && (
          <div className={`mt-4 p-4 rounded-lg flex items-start ${
            uploadStatus.type === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 
            uploadStatus.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
            'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
          }`}>
            <div className="flex-shrink-0 mr-3 mt-0.5">
              {uploadStatus.type === 'error' ? (
                <AlertCircle className="h-5 w-5" />
              ) : uploadStatus.type === 'success' ? (
                <Upload className="h-5 w-5" />
              ) : (
                <Info className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium">{uploadStatus.message}</p>
            </div>
          </div>
        )}
        
        {/* Debug buttons - only show when not uploading */}
        {!isUploading && (
          <div className="mt-4 flex justify-between">
            <button
              type="button"
              className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm"
              onClick={handleTestFileClick}
            >
              Upload Test File
            </button>
            
            <button
              type="button"
              className="bg-secondary text-secondary-foreground px-4 py-2 rounded text-sm"
              onClick={resetStatus}
            >
              Reset Status
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export default FileUploadModal; 