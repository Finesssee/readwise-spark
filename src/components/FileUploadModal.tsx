import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Upload, AlertCircle, Info } from 'lucide-react';
import { processUploadedFile } from '@/utils/uploadUtils';
import { useToast } from '@/components/ui/use-toast';

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
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{message: string, type: 'info' | 'error' | 'success'} | null>(null);
  const [bytesProcessed, setBytesProcessed] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Process the files
  const handleFiles = useCallback(async (files: FileList) => {
    // PERFORMANCE OPTIMIZATION: Immediately acknowledge user action
    // Reset states
    setIsUploading(true);
    setUploadStatus({message: 'Preparing file...', type: 'info'});
    
    // PERFORMANCE OPTIMIZATION: Use a small delay to allow UI to update first
    // This makes the app feel more responsive
    await new Promise(resolve => setTimeout(resolve, 10));
    
    try {
      // PERFORMANCE OPTIMIZATION: Process one file at a time for better feedback
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Fast pre-validation before heavy processing
        const validation = validateFileBeforeUpload(file);
        if (!validation.isValid) {
          setUploadStatus({message: validation.message || 'Invalid file', type: 'error'});
          toast({
            title: 'Validation Failed',
            description: validation.message || 'Invalid file',
            type: 'error'
          });
          setIsUploading(false);
          return;
        }
        
        // Show more granular processing feedback
        setTotalBytes(file.size);
        setBytesProcessed(0); // Reset progress for this file
        setUploadStatus({message: 'Preparing file...', type: 'info'});
        
        // PERFORMANCE OPTIMIZATION: Improved progress simulation
        // More responsive progress updates that don't block the main thread
        let isCancelled = false;
        const progressInterval = setInterval(() => {
          if (isCancelled) {
            clearInterval(progressInterval);
            return;
          }
          
          setBytesProcessed(prev => {
            // Gradual acceleration to 90%
            const remaining = file.size - prev;
            if (remaining <= 0) return prev;
            
            const increment = Math.min(
              Math.max(remaining * 0.1, 1024), // At least 1KB, at most 10% of remaining
              remaining * 0.2 // Don't go past 90% total
            );
            
            return Math.min(prev + increment, file.size * 0.9); // Cap at 90%
          });
        }, 100);
        
        // PERFORMANCE OPTIMIZATION: Use non-blocking processing
        // Start file processing (doesn't wait for background tasks)
        const processingPromise = processUploadedFile(file).catch(error => {
          console.error('Error processing file:', error);
          return {
            status: 'error' as const,
            message: error instanceof Error ? error.message : 'An unknown error occurred' 
          };
        });
        
        // PERFORMANCE OPTIMIZATION: Set a timeout to ensure we don't wait forever
        // This creates a race between processing and a timeout
        const timeoutPromise = new Promise<{
          status: 'pending';
          message: string;
        }>((resolve) => {
          setTimeout(() => {
            resolve({
              status: 'pending',
              message: 'Processing is continuing in the background. You can check back later.'
            });
          }, 5000); // 5 second timeout for better responsiveness
        });
        
        // Race between processing and timeout
        const result = await Promise.race([processingPromise, timeoutPromise]);
        
        // Stop progress simulation
        isCancelled = true;
        clearInterval(progressInterval);
        
        // Set progress to 100% to indicate completion
        setBytesProcessed(file.size);
        
        // Update status
        const statusMessage = result.status === 'success' 
          ? 'Opening file...' 
          : result.message;
          
        setUploadStatus({
          message: statusMessage,
          type: result.status === 'success' ? 'success' : (result.status === 'pending' ? 'info' : 'error')
        });
        
        // Show toast notification
        toast({
          title: result.status === 'success' 
            ? 'Upload Success' 
            : (result.status === 'pending' ? 'Processing' : 'Upload Failed'),
          description: statusMessage,
          type: result.status === 'success' ? 'success' : (result.status === 'pending' ? 'info' : 'error')
        });
        
        // If successful, navigate to the reader view
        if (result.status === 'success' && result.readerId) {
          // Close modal before navigation
          onClose();
          
          // PERFORMANCE OPTIMIZATION: Small delay for modal closing animation
          await new Promise(resolve => setTimeout(resolve, 50));
          
          // Navigate to reader view
          navigate(`/reader/${result.readerId}`);
          return; // Exit after navigation
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error uploading file';
      setUploadStatus({message: errorMessage, type: 'error'});
      
      toast({
        title: 'Upload Failed',
        description: errorMessage,
        type: 'error'
      });
    } finally {
      setIsUploading(false);
    }
  }, [toast, onClose, navigate]);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
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
  }, [handleFiles]);

  // Handle file input change with useCallback
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

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

  // Calculate upload progress percentage
  const uploadProgress = useMemo(() => {
    if (totalBytes === 0) return 0;
    return Math.min(100, Math.round((bytesProcessed / totalBytes) * 100));
  }, [bytesProcessed, totalBytes]);

  // Don't render if not open
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
        
        {/* Drag & Drop Area - simplified while uploading */}
        {!isUploading ? (
          <div
            className={`mt-4 p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors duration-200 ${
              isDragging ? 'border-primary bg-primary/5' : 'border-border'
            }`}
            onDragOver={handleDragEnter}
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