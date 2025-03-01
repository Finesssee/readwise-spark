import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { 
  Link2, 
  Upload, 
  Mail, 
  Rss,
  Twitter
} from 'lucide-react';
import FileUploadModal from './FileUploadModal';

// Add button dropdown menu component
type AddMenuItemProps = {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
};

const AddMenuItem: React.FC<AddMenuItemProps> = ({ icon, label, shortcut, onClick }) => {
  return (
    <div 
      className="flex items-center justify-between px-4 py-2.5 hover:bg-secondary/50 cursor-pointer"
      onClick={onClick}
      style={{ backgroundColor: 'var(--background-solid)' }}
    >
      <div className="flex items-center">
        <span className="mr-3 text-foreground">{icon}</span>
        <span className="text-sm text-foreground">{label}</span>
      </div>
      {shortcut && <span className="text-xs text-muted-foreground ml-4">{shortcut}</span>}
    </div>
  );
};

interface AddMenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  position: { top: number; left: number };
  onAddUrl: () => void;
  onAddUpload: () => void;
  onAddEmail: () => void;
  onAddRssFeed: () => void;
  onAddTwitterList: () => void;
}

const AddMenuDropdown: React.FC<AddMenuDropdownProps> = ({
  isOpen,
  onClose,
  position,
  onAddUrl,
  onAddUpload,
  onAddEmail,
  onAddRssFeed,
  onAddTwitterList
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Handle upload click
  const handleUploadClick = () => {
    setIsUploadModalOpen(true);
    onClose(); // Close the dropdown
  };

  if (!isOpen) return null;

  // Use createPortal to render both the dropdown and the modal at the document root
  return (
    <>
      {ReactDOM.createPortal(
        <div 
          ref={menuRef}
          style={{
            position: 'fixed',
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: 'translateZ(0)', // Force GPU acceleration
            animation: 'dropdown-in 100ms ease-out forwards',
            backgroundColor: 'var(--background-solid)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
          }}
          className="w-60 rounded-md z-[99999] overflow-hidden py-1 border border-border"
        >
          <AddMenuItem 
            icon={<Link2 className="h-5 w-5" />} 
            label="URL" 
            shortcut="A"
            onClick={onAddUrl}
          />
          <AddMenuItem 
            icon={<Upload className="h-5 w-5" />} 
            label="Upload" 
            shortcut="U"
            onClick={handleUploadClick}
          />
          <AddMenuItem 
            icon={<Mail className="h-5 w-5" />} 
            label="Email" 
            onClick={onAddEmail}
          />
          <AddMenuItem 
            icon={<Rss className="h-5 w-5" />} 
            label="RSS Feed" 
            shortcut="Shift A"
            onClick={onAddRssFeed}
          />
          <AddMenuItem 
            icon={<Twitter className="h-5 w-5" />} 
            label="Twitter List" 
            shortcut="Shift A"
            onClick={onAddTwitterList}
          />
        </div>,
        document.body
      )}

      {/* Upload Modal - Also render using portal */}
      {isUploadModalOpen && ReactDOM.createPortal(
        <FileUploadModal 
          isOpen={isUploadModalOpen} 
          onClose={() => setIsUploadModalOpen(false)} 
        />,
        document.body
      )}
    </>
  );
};

export default AddMenuDropdown; 