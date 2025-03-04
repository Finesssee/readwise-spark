import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import FileUploadModal from './FileUploadModal';
import { useUploadHotkey } from '@/hooks/use-upload-hotkey';

const GlobalUploadButton: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };
  
  // Use the same hotkey hook for consistency
  useUploadHotkey(handleOpenModal);

  return (
    <>
      {/* Floating Upload Button */}
      <button
        onClick={handleOpenModal}
        className="fixed bottom-8 right-8 p-4 bg-primary text-white rounded-full shadow-lg hover:bg-primary/90 transition-all z-50"
        aria-label="Upload file"
        title="Upload file (Ctrl+U)"
      >
        <Upload className="h-6 w-6" />
      </button>

      {/* Upload Modal */}
      <FileUploadModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal}
      />
    </>
  );
};

export default GlobalUploadButton; 