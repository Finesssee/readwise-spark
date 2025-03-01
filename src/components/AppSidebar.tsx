import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Library, 
  FileText, 
  Book, 
  Mail, 
  FileIcon, 
  Twitter, 
  Video,
  Tag,
  Rss,
  Star,
  Trash,
  ChevronDown,
  ChevronRight,
  Plus,
  Link2, 
  Upload, 
  Chrome, 
  Download, 
  Search as SearchIcon, 
  MoreHorizontal,
  Settings,
  ChevronLeft,
  ChevronLeftSquare,
  ChevronRightSquare,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

import { cn } from '@/lib/utils';
import AddMenuDropdown from './AddMenuDropdown';

type SidebarItemProps = {
  icon: React.ReactNode;
  label: string;
  to?: string;
  onClick?: () => void;
  active?: boolean;
  children?: React.ReactNode;
  isNested?: boolean;
};

type ExpandableSectionProps = {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  to?: string;
  active?: boolean;
};

const SidebarItem: React.FC<SidebarItemProps> = ({ 
  icon, 
  label, 
  to, 
  onClick, 
  active = false,
  isNested = false
}) => {
  const content = (
    <div 
      className={cn(
        "flex items-center px-3 py-2 rounded-md transition-colors",
        active ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-secondary/50 hover:text-primary",
        isNested ? "pl-8" : ""
      )}
      onClick={onClick}
    >
      <span className="mr-3">{icon}</span>
      <span className="text-sm">{label}</span>
    </div>
  );

  if (to) {
    return <Link to={to}>{content}</Link>;
  }

  return content;
};

const ExpandableSection: React.FC<ExpandableSectionProps> = ({ 
  icon, 
  label, 
  children,
  defaultOpen = false,
  to,
  active = false
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const headerContent = (
    <div 
      className="flex items-center justify-between px-3 py-2 text-muted-foreground hover:text-primary cursor-pointer"
      onClick={() => setIsOpen(!isOpen)}
    >
      <div className="flex items-center">
        <span className="mr-3">{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
    </div>
  );

  return (
    <div>
      {to ? (
        <div className="flex items-center justify-between">
          <Link to={to} className="flex-grow">
            <div className={cn(
              "flex items-center px-3 py-2 rounded-md transition-colors",
              active ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-secondary/50 hover:text-primary"
            )}>
              <span className="mr-3">{icon}</span>
              <span className="text-sm">{label}</span>
            </div>
          </Link>
          <div 
            className="px-3 py-2 cursor-pointer"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
      ) : (
        headerContent
      )}
      {isOpen && (
        <div className="mt-1">
          {children}
        </div>
      )}
    </div>
  );
};

const AppSidebar = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // Update position on mount and window resize
  useEffect(() => {
    const updatePosition = () => {
      if (menuButtonRef.current) {
        const rect = menuButtonRef.current.getBoundingClientRect();
        setMenuPosition({
          top: rect.bottom + 10, // Increased space to avoid overlapping
          left: rect.right // Position dropdown to the right of the button
        });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, []);

  // Placeholder functions for menu items
  const handleAddUrl = () => {
    console.log('Add URL clicked');
    setIsAddMenuOpen(false);
  };

  const handleAddUpload = () => {
    console.log('Add Upload clicked');
    setIsAddMenuOpen(false);
    // Upload functionality is now handled in the AddMenuDropdown component
  };

  const handleAddEmail = () => {
    console.log('Add Email clicked');
    setIsAddMenuOpen(false);
  };

  const handleAddRssFeed = () => {
    console.log('Add RSS Feed clicked');
    setIsAddMenuOpen(false);
  };

  const handleAddTwitterList = () => {
    console.log('Add Twitter List clicked');
    setIsAddMenuOpen(false);
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div 
      className={cn(
        "flex flex-col h-full bg-sidebar text-sidebar-foreground will-change-transform",
        "transition-all duration-150 ease-out transform",
        isCollapsed ? "w-16" : "w-64"
      )}
      data-collapsed={isCollapsed}
      style={{
        backfaceVisibility: 'hidden', // Prevents flickering in some browsers
        perspective: '1000px', // Helps with hardware acceleration
        transform: 'translateZ(0)' // Forces GPU acceleration
      }}
    >
      {/* Logo and collapse button */}
      <div className="p-4 flex items-center justify-between">
        {!isCollapsed && <h2 className="text-xl font-bold transition-opacity duration-100 ease-out">Readwise</h2>}
        <div className="flex items-center space-x-2">
          {!isCollapsed && (
            <button
              ref={menuButtonRef}
              className="h-8 w-8 border border-sidebar-border flex items-center justify-center rounded hover:bg-sidebar-accent transition-colors duration-100"
              onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
          <button
            className="h-8 w-8 border border-sidebar-border flex items-center justify-center rounded hover:bg-sidebar-accent transition-colors duration-100"
            onClick={toggleSidebar}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Add Menu Dropdown - Using Portal */}
      <AddMenuDropdown
        isOpen={isAddMenuOpen && !isCollapsed}
        onClose={() => setIsAddMenuOpen(false)}
        position={menuPosition}
        onAddUrl={handleAddUrl}
        onAddUpload={handleAddUpload}
        onAddEmail={handleAddEmail}
        onAddRssFeed={handleAddRssFeed}
        onAddTwitterList={handleAddTwitterList}
      />

      {/* Navigation */}
      <div className="flex-grow overflow-auto px-2 py-2 space-y-1">
        {/* Home Item */}
        {isCollapsed ? (
          <div className="flex justify-center py-2">
            <Link to="/" className={cn(
              "p-2 rounded-md transition-colors",
              currentPath === '/' ? "bg-secondary" : "hover:bg-secondary/50"
            )}>
              <Home className={cn(
                "h-5 w-5",
                currentPath === '/' ? "text-primary" : "text-muted-foreground"
              )} />
            </Link>
          </div>
        ) : (
          <SidebarItem
            icon={<Home className="h-4 w-4" />}
            label="Home"
            to="/"
            active={currentPath === '/'}
          />
        )}

        {/* Library Section */}
        {isCollapsed ? (
          <div className="flex justify-center py-2">
            <Link to="/library" className={cn(
              "p-2 rounded-md transition-colors",
              currentPath === '/library' || currentPath.startsWith('/articles') ? "bg-secondary" : "hover:bg-secondary/50"
            )}>
              <Library className={cn(
                "h-5 w-5",
                currentPath === '/library' || currentPath.startsWith('/articles') ? "text-primary" : "text-muted-foreground"
              )} />
            </Link>
          </div>
        ) : (
          <ExpandableSection 
            icon={<Library className="h-4 w-4" />} 
            label="Library"
            defaultOpen={currentPath === '/library' || currentPath.startsWith('/articles') || currentPath.startsWith('/books') || currentPath.startsWith('/emails') || currentPath.startsWith('/pdfs') || currentPath.startsWith('/tweets') || currentPath.startsWith('/videos') || currentPath.startsWith('/tags')}
            to="/library"
            active={currentPath === '/library'}
          >
            <SidebarItem
              icon={<FileText className="h-4 w-4" />}
              label="Articles"
              to="/articles"
              isNested
              active={currentPath === '/articles'}
            />
            <SidebarItem
              icon={<Book className="h-4 w-4" />}
              label="Books"
              to="/library"
              isNested
              active={currentPath === '/library'}
            />
            <SidebarItem
              icon={<Mail className="h-4 w-4" />}
              label="Emails"
              to="/emails"
              isNested
              active={currentPath === '/emails'}
            />
            <SidebarItem
              icon={<FileIcon className="h-4 w-4" />}
              label="PDFs"
              to="/pdfs"
              isNested
              active={currentPath === '/pdfs'}
            />
            <SidebarItem
              icon={<Twitter className="h-4 w-4" />}
              label="Tweets"
              to="/tweets"
              isNested
              active={currentPath === '/tweets'}
            />
            <SidebarItem
              icon={<Video className="h-4 w-4" />}
              label="Videos"
              to="/videos"
              isNested
              active={currentPath === '/videos'}
            />
            <SidebarItem
              icon={<Tag className="h-4 w-4" />}
              label="Tags"
              to="/tags"
              isNested
              active={currentPath === '/tags'}
            />
          </ExpandableSection>
        )}

        {/* Feed Section */}
        {isCollapsed ? (
          <div className="flex justify-center py-2">
            <Link to="/feeds" className={cn(
              "p-2 rounded-md transition-colors",
              currentPath === '/feeds' ? "bg-secondary" : "hover:bg-secondary/50"
            )}>
              <Rss className={cn(
                "h-5 w-5",
                currentPath === '/feeds' ? "text-primary" : "text-muted-foreground"
              )} />
            </Link>
          </div>
        ) : (
          <ExpandableSection 
            icon={<Rss className="h-4 w-4" />} 
            label="Feed"
            defaultOpen={currentPath === '/feeds'}
          >
            <SidebarItem
              icon={<span className="text-xs">→</span>}
              label="Manage feeds"
              to="/feeds"
              isNested
              active={currentPath === '/feeds'}
            />
          </ExpandableSection>
        )}

        {/* Pinned Section */}
        {isCollapsed ? (
          <div className="flex justify-center py-2">
            <Link to="/shortlist" className={cn(
              "p-2 rounded-md transition-colors",
              currentPath === '/shortlist' ? "bg-secondary" : "hover:bg-secondary/50"
            )}>
              <Star className={cn(
                "h-5 w-5 text-yellow-400",
                currentPath === '/shortlist' ? "text-primary" : ""
              )} />
            </Link>
          </div>
        ) : (
          <div className="py-2">
            <div className="flex items-center justify-between px-3 mb-1">
              <span className="text-xs text-muted-foreground">Pinned</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </div>
            <SidebarItem
              icon={<Star className="h-4 w-4 text-yellow-400" />}
              label="Shortlist"
              to="/shortlist"
              active={currentPath === '/shortlist'}
            />
            <SidebarItem
              icon={<span className="text-xs">→</span>}
              label="Manage views"
              to="/views"
              active={currentPath === '/views'}
            />
          </div>
        )}

        {!isCollapsed && <div className="h-px bg-gray-800 my-2" />}

        {/* Trash Item */}
        {isCollapsed ? (
          <div className="flex justify-center py-2">
            <Link to="/trash" className={cn(
              "p-2 rounded-md transition-colors",
              currentPath === '/trash' ? "bg-secondary" : "hover:bg-secondary/50"
            )}>
              <Trash className={cn(
                "h-5 w-5",
                currentPath === '/trash' ? "text-primary" : "text-muted-foreground"
              )} />
            </Link>
          </div>
        ) : (
          <SidebarItem
            icon={<Trash className="h-4 w-4" />}
            label="Trash"
            to="/trash"
            active={currentPath === '/trash'}
          />
        )}
      </div>
    </div>
  );
};

export default AppSidebar; 