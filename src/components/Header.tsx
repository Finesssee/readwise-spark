
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, BookOpen, Plus, Settings, Menu, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const Header = () => {
  const isMobile = useIsMobile();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  return (
    <header className="sticky top-0 z-50 glass backdrop-blur-md border-b">
      <div className="container flex items-center justify-between h-16 px-4 md:px-6 mx-auto">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center">
            <BookOpen className="w-6 h-6 mr-2" />
            <span className="text-xl font-medium tracking-tight">Spark</span>
          </Link>
        </div>
        
        {!isMobile && (
          <div className="flex-1 max-w-xl px-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search articles, highlights and notes..."
                className="w-full bg-background/50 border border-border rounded-full h-9 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          {!isMobile ? (
            <>
              <button className="p-2 rounded-full hover:bg-secondary transition-colors duration-200">
                <Plus className="h-5 w-5" />
              </button>
              <button className="p-2 rounded-full hover:bg-secondary transition-colors duration-200">
                <Settings className="h-5 w-5" />
              </button>
            </>
          ) : (
            <button 
              className="p-2 rounded-full hover:bg-secondary transition-colors duration-200"
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
          "absolute top-16 left-0 right-0 glass z-50 border-b animate-fadeIn",
        )}>
          <div className="container px-4 py-4 mx-auto space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search..."
                className="w-full bg-background/50 border border-border rounded-full h-9 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <nav className="space-y-2">
              <Link to="/" className="flex items-center p-2 hover:bg-secondary rounded-md transition-colors duration-200">
                <BookOpen className="w-5 h-5 mr-3" />
                <span>My Library</span>
              </Link>
              <button className="flex items-center p-2 w-full text-left hover:bg-secondary rounded-md transition-colors duration-200">
                <Plus className="w-5 h-5 mr-3" />
                <span>Add New</span>
              </button>
              <button className="flex items-center p-2 w-full text-left hover:bg-secondary rounded-md transition-colors duration-200">
                <Settings className="w-5 h-5 mr-3" />
                <span>Settings</span>
              </button>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
