import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Settings, 
  Menu, 
  X,
  Upload
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/lib/constants/ui';
import SearchDialog from '@/components/search/SearchDialog';
import FileUploadModal from '@/components/FileUploadModal';
import { useSearchHotkey } from '@/hooks/use-search-hotkey';
import { useUploadHotkey } from '@/hooks/use-upload-hotkey';

const Header = () => {
  const isMobile = useIsMobile();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  
  // Add keyboard shortcuts
  useSearchHotkey(() => setSearchOpen(true));
  useUploadHotkey(() => setUploadModalOpen(true));

  return (
    <>
      <header className="sticky top-0 z-50 glass backdrop-blur-md border-b hardware-accelerated">
        <div className="flex items-center justify-between h-16 px-4 md:px-6">
          {/* Left side - empty or for navigation breadcrumbs */}
          <div className="flex items-center gap-2">
            {/* Empty space for now, could be used for breadcrumbs */}
          </div>

          {/* Right side with search and settings */}
          <div className="flex items-center gap-2">
            {!isMobile ? (
              <>
                <Button
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "relative h-9 w-9 p-0 xl:h-10 xl:w-60 xl:justify-start xl:px-3 xl:py-2 transition-medium"
                  )}
                  onClick={() => setSearchOpen(true)}
                >
                  <Search className="h-4 w-4 xl:mr-2" />
                  <span className="hidden xl:inline-flex">Search articles...</span>
                  <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 xl:flex">
                    <span className="text-xs">⌘</span>K
                  </kbd>
                </Button>
                
                {/* Upload Button */}
                <div className="relative">
                  <button 
                    className="p-2 rounded-full hover:bg-secondary transition-colors duration-100"
                    onClick={() => setUploadModalOpen(true)}
                    title="Upload file (Ctrl+U)"
                  >
                    <Upload className="h-5 w-5" />
                  </button>
                  <kbd className="hidden xl:flex absolute -bottom-8 right-0 pointer-events-none h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs">⌘</span>U
                  </kbd>
                </div>
                
                <button className="p-2 rounded-full hover:bg-secondary transition-colors duration-100">
                  <Settings className="h-5 w-5" />
                </button>
              </>
            ) : (
              <button 
                className="p-2 rounded-full hover:bg-secondary transition-colors duration-100"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
              >
                {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}
          </div>
        </div>
        
        {/* Mobile Menu */}
        {isMobile && showMobileMenu && (
          <div className={cn(
            "absolute top-16 left-0 right-0 glass z-50 border-b animate-dropdown hardware-accelerated"
          )}>
            <div className="px-4 py-4 space-y-4">
              <nav className="space-y-2">
                <Link to="/" className="flex items-center p-2 hover:bg-secondary rounded-md transition-colors duration-100">
                  <span>My Library</span>
                </Link>
                
                {/* Mobile Upload Option */}
                <button 
                  className="flex items-center p-2 w-full text-left hover:bg-secondary rounded-md transition-colors duration-100"
                  onClick={() => {
                    setShowMobileMenu(false);
                    setUploadModalOpen(true);
                  }}
                >
                  <Upload className="w-5 h-5 mr-3" />
                  <span>Upload File</span>
                </button>
                
                <button className="flex items-center p-2 w-full text-left hover:bg-secondary rounded-md transition-colors duration-100">
                  <Settings className="w-5 h-5 mr-3" />
                  <span>Settings</span>
                </button>
              </nav>
            </div>
          </div>
        )}

        <SearchDialog
          open={searchOpen}
          onOpenChange={setSearchOpen}
        />
      </header>
      
      {/* File Upload Modal */}
      <FileUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
      />
    </>
  );
};

export default Header;
