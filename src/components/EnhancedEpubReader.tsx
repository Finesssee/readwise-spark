import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Article, Highlight, ReaderViewMode } from '@/lib/types';
import { 
  ArrowLeft, 
  ArrowRight,
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  Download,
  Info,
  Minus,
  Plus,
  RotateCw,
  AlignLeft,
  FileText,
  Maximize2,
  Minimize2,
  BookOpen,
  Search,
  Bookmark,
  X,
  ListFilter,
  Menu,
  ChevronLeft,
  ChevronRight,
  Settings
} from 'lucide-react';
import ePub from 'epubjs';
import Book from 'epubjs/types/book';
import Rendition from 'epubjs/types/rendition';
import Contents from 'epubjs/types/contents';
import Navigation from 'epubjs/types/navigation';
import { v4 as uuidv4 } from 'uuid';
import { Link } from 'react-router-dom';

// Add CFI property to Highlight type
interface EPubHighlight extends Highlight {
  cfi?: string;
}

interface EnhancedEpubReaderProps {
  article: Article;
  onUpdateArticle?: (article: Article) => void;
}

interface NavItem {
  id: string;
  href: string;
  label: string;
  subitems?: NavItem[];
  level: number;
}

// Interface for epubjs navigation item
interface EPubNavItem {
  href: string;
  label: string;
  subitems?: EPubNavItem[];
  [key: string]: unknown;
}

interface EPubMetadata {
  title?: string;
  creator?: string;
  language?: string;
  publisher?: string;
  pubdate?: string;
  identifier?: string;
  description?: string;
  [key: string]: unknown;
}

interface TextSelectionPosition {
  x: number;
  y: number;
  text: string;
  cfi?: string;
}

// Interface for search results
interface SearchResult {
  cfi: string;
  excerpt: string;
  index: number;
}

// Interface for EPUB location information
interface EPUBLocation {
  start: {
    index?: number;
    href?: string;
    location?: number;
    displayed?: {
      page?: number;
      total?: number;
    };
    [key: string]: unknown;
  };
  end?: {
    index?: number;
    href?: string;
    location?: number;
    [key: string]: unknown;
  };
  percentage?: number;
  [key: string]: unknown;
}

// Replace the Function type with a more specific function type
type AnnotationsWithAdd = {
  add(
    type: string, 
    cfi: string, 
    data?: object, 
    callback?: () => void, 
    className?: string
  ): void;
  clear(type?: string): void;
};

const EnhancedEpubReader: React.FC<EnhancedEpubReaderProps> = ({ article, onUpdateArticle }) => {
  // State for reader
  const [book, setBook] = useState<Book | null>(null);
  const [rendition, setRendition] = useState<Rendition | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [fontSize, setFontSize] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tocExpanded, setTocExpanded] = useState(true);
  const [infoExpanded, setInfoExpanded] = useState(true);
  const [tocItems, setTocItems] = useState<NavItem[]>([]);
  const [metadata, setMetadata] = useState<Record<string, unknown>>({});
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [currentChapter, setCurrentChapter] = useState<string>('');
  
  // Selection and highlights
  const [textSelection, setTextSelection] = useState<TextSelectionPosition | null>(null);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [currentHighlight, setCurrentHighlight] = useState<Highlight | null>(null);
  
  // Search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  
  // Refs
  const viewerRef = useRef<HTMLDivElement>(null);
  
  // Generate locations for page numbers
  const generateLocations = useCallback(async (book: Book) => {
    if (!book) return;
    
    setLoadingLocations(true);
    
    try {
      // Reduce the number of spine items processed for faster initial load
      // This significantly speeds up the initial rendering
      type LocationsWithGenerate = {
        generate: (spineItems?: number) => Promise<void>;
        total: number;
      };
      const locations = book.locations as unknown as LocationsWithGenerate;
      
      // Use a smaller sample size (128 instead of 512) for much faster initial loading
      // This gives ~4x speedup in location generation while maintaining reasonable accuracy
      await locations.generate(128);
      
      const totalLoc = locations.total || 1;
      setTotalPages(totalLoc);
      setLoadingLocations(false);
    } catch (error) {
      console.error('Error generating EPUB locations:', error);
      setLoadingLocations(false);
    }
  }, []);
  
  // Initialize reader
  const initializeReader = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      
      if (!viewerRef.current) return;
      
      // Check if we have a valid URL
      if (!article.url) {
        console.error('Missing URL for EPUB file', article);
        setError('Missing URL for EPUB file. Please try re-uploading the book.');
        setIsLoading(false);
        return;
      }
      
      console.log('Initializing EPUB with URL:', article.url);
      
      // OPTIMIZATION: Set initialization options for faster loading
      const epubBook = ePub(article.url, {
        openAs: 'epub', // Explicitly specify format
        restore: true, // Enable position restoration
        storage: true, // Use localStorage for caching
      });
      
      // OPTIMIZATION: Set rendering options
      if (epubBook.rendition) {
        epubBook.rendition.spread('none'); // Disable spreads for faster rendering
      }
      
      setBook(epubBook);
      
      // OPTIMIZATION: Load content progressively
      const rendition = epubBook.renderTo(viewerRef.current, {
        width: '100%',
        height: '100%',
        allowScriptedContent: false, // Disable scripts for security and performance
        flow: 'paginated', // Use pagination for better reading experience
        maxSpreadCount: 1, // Limit to 1 spread for better performance
        minSpreadCount: 1,
      });
      
      // Set rendition state immediately for faster UI response
      setRendition(rendition);
            
      // Load the initial content
      await rendition.display();
            
      // Show content immediately
      setIsLoading(false);
      
      // OPTIMIZATION: Defer non-critical operations
      setTimeout(async () => {
        try {
          // Load metadata
          const metadata = await epubBook.loaded.metadata;
          setMetadata(metadata);
          
          // Load cover
          if (epubBook.archive) {
            const coverUrl = await epubBook.archive.createUrl(epubBook.cover, { base64: true });
            setCoverUrl(coverUrl);
          }
          
          // Update TOC
          epubBook.loaded.navigation.then((nav) => {
            if (nav && nav.toc) {
              const items = processNavItems(nav.toc as unknown as Record<string, unknown>[]);
              setTocItems(items);
            }
          }).catch(e => console.error('Error loading TOC:', e));
          
          // Generate locations in the background after content is visible
          generateLocations(epubBook);
        } catch (error) {
          console.error('Error in deferred loading:', error);
        }
      }, 100); // Short delay to ensure main content renders first
      
      // Set up event listeners
      rendition.on('relocated', (location: EPUBLocation) => {
        if (location.start && location.start.displayed) {
          const current = location.start.displayed.page || 0;
          const total = location.start.displayed.total || 1;
          setCurrentPage(current);
          setTotalPages(total);
        }
        
        if (location.start && location.start.href) {
          // Get chapter title
          const href = location.start.href.split('#')[0];
          const title = getSpineItemTitle(href);
          setCurrentChapter(title);
        }
        
        if (location.percentage) {
          updateReadingProgress(location.percentage * 100);
        }
      });
      
      // Text selection handling
      rendition.on("selected", (cfiRange: string, contents: any) => {
        const range = contents.range(cfiRange);
        if (range) {
          const text = range.toString();
          if (text && text.trim().length > 0) {
            // Get position for highlight menu
            const rect = range.getBoundingClientRect();
            
            if (rect) {
              // Only show menu for non-empty selections
              setTextSelection({
                x: rect.left + (rect.width / 2),
                y: rect.top - 10,
                text,
                cfi: cfiRange
              });
              
              setShowHighlightMenu(true);
            }
          }
        }
      });
      
      // Hide highlight menu when clicking elsewhere
      rendition.on("click", () => {
        if (showHighlightMenu) {
          setShowHighlightMenu(false);
        }
      });
      
      // Set up locations for navigation
      if (epubBook.locations && typeof epubBook.locations.generate === 'function') {
        // Type assertion for locations
        const locationsWithGenerate = epubBook.locations as unknown as LocationsWithGenerate;
        
        // Use a worker if available for generating locations
        setLoadingLocations(true);
        try {
          await locationsWithGenerate.generate(1024);
          setTotalPages(locationsWithGenerate.total);
        } catch (err) {
          console.error('Error generating EPUB locations:', err);
        } finally {
          setLoadingLocations(false);
        }
      }
      
      // On cleanup
      return () => {
        if (epubBook) {
          console.log('Cleaning up EPUB reader...');
          try {
            if (rendition) {
              rendition.off("keydown", handleKeyDown);
              rendition.off("selected");
              rendition.off("relocated");
              rendition.off("click");
            }
            
            epubBook.destroy();
          } catch (e) {
            console.error('Error during EPUB cleanup:', e);
          }
        }
      };
    } catch (error) {
      console.error('Error initializing EPUB reader:', error);
      setError(error instanceof Error ? error.message : 'Unknown error initializing reader');
      setIsLoading(false);
    }
  }, [article.url, fontSize, generateLocations]);
  
  // Initialize on mount
  useEffect(() => {
    initializeReader();
    
    return () => {
      if (book) {
        try {
          book.destroy();
        } catch (err) {
          console.error('Error destroying EPUB instance:', err);
        }
      }
    };
  }, [initializeReader, book]);
  
  // Navigation functions
  const goToPrevPage = useCallback(() => {
    if (rendition) {
      rendition.prev();
    }
  }, [rendition]);
  
  const goToNextPage = useCallback(() => {
    if (rendition) {
      rendition.next();
    }
  }, [rendition]);
  
  // Font size controls
  const changeFontSize = useCallback((delta: number) => {
    const newSize = Math.max(50, Math.min(200, fontSize + delta));
    setFontSize(newSize);
    
    if (rendition) {
      rendition.themes.fontSize(`${newSize}%`);
    }
  }, [fontSize, rendition]);
  
  const resetFontSize = useCallback(() => {
    setFontSize(100);
    if (rendition) {
      rendition.themes.fontSize('100%');
    }
  }, [rendition]);
  
  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      viewerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);
  
  // Navigate to TOC item
  const navigateToTocItem = useCallback((href: string) => {
    if (rendition) {
      rendition.display(href);
    }
  }, [rendition]);
  
  // Handle highlight
  const handleHighlight = useCallback((color: string) => {
    if (!textSelection || !rendition || !textSelection.cfi || !onUpdateArticle) return;
    
    const newHighlight: Highlight = {
      id: uuidv4(),
      articleId: article.id,
      text: textSelection.text,
      color: color as "yellow" | "blue" | "green" | "pink" | "purple" | "orange" | "red" | "teal",
      createdAt: new Date().toISOString(),
      cfi: textSelection.cfi
    };
    
    // Add highlight to the DOM
    if (textSelection.cfi) {
      // Using direct annotation API with specific function types
      const annotations = rendition.annotations as unknown as AnnotationsWithAdd;
      annotations.add('highlight', textSelection.cfi, {}, undefined, color);
    }
    
    const updatedArticle = {
      ...article,
      highlights: [...article.highlights, newHighlight]
    };
    
    onUpdateArticle(updatedArticle);
    setCurrentHighlight(newHighlight as Highlight);
    setShowHighlightMenu(false);
    setShowNoteDialog(true);
  }, [textSelection, rendition, onUpdateArticle, article]);
  
  // Add note to highlight
  const handleAddNote = useCallback((note: string) => {
    if (!currentHighlight || !onUpdateArticle) return;
    
    const updatedHighlight = {
      ...currentHighlight,
      note
    };
    
    const updatedHighlights = article.highlights.map(h => 
      h.id === currentHighlight.id ? updatedHighlight : h
    );
    
    const updatedArticle = {
      ...article,
      highlights: updatedHighlights
    };
    
    onUpdateArticle(updatedArticle);
    setCurrentHighlight(null);
    setShowNoteDialog(false);
  }, [currentHighlight, onUpdateArticle, article]);
  
  // Search functionality
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !book) return;
    
    setIsSearching(true);
    setSearchResults([]);
    
    try {
      // @ts-expect-error - epubjs search is not in the types
      const results = await book.search(searchQuery);
      setSearchResults(results);
      
      if (results.length > 0) {
        setCurrentSearchIndex(0);
        if (rendition && results[0].cfi) {
          rendition.display(results[0].cfi);
        }
      }
    } catch (error) {
      console.error('Error searching EPUB:', error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, book, rendition]);
  
  // Navigate through search results
  const navigateSearchResults = useCallback((direction: 'next' | 'prev') => {
    if (searchResults.length === 0) return;
    
    let newIndex = currentSearchIndex;
    
    if (direction === 'next') {
      newIndex = (currentSearchIndex + 1) % searchResults.length;
    } else {
      newIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    }
    
    setCurrentSearchIndex(newIndex);
    
    if (rendition && searchResults[newIndex].cfi) {
      rendition.display(searchResults[newIndex].cfi);
    }
  }, [searchResults, currentSearchIndex, rendition]);
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrevPage();
      } else if (e.key === 'ArrowRight') {
        goToNextPage();
      } else if (e.key === '+' || e.key === '=') {
        changeFontSize(10);
      } else if (e.key === '-') {
        changeFontSize(-10);
      } else if (e.key === '0') {
        resetFontSize();
      } else if (e.key === 'f' && e.ctrlKey) {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [goToPrevPage, goToNextPage, changeFontSize, resetFontSize, toggleFullscreen]);
  
  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);
  
  // Apply highlights when component mounts
  useEffect(() => {
    if (!rendition || !article.highlights) return;
    
    // Clear existing highlights - modified for TS compatibility
    try {
      // Using direct annotation API with specific function types
      const annotations = rendition.annotations as unknown as AnnotationsWithAdd;
      annotations.clear('highlight'); // Pass the type parameter to clear
    } catch (error) {
      console.error('Error clearing annotations:', error);
    }
    
    // Apply all saved highlights
    article.highlights.forEach(highlight => {
      // Cast to our extended type to access the cfi property
      const epubHighlight = highlight as EPubHighlight;
      if (epubHighlight.cfi) {
        // Using direct annotation API with specific function types
        const annotations = rendition.annotations as unknown as AnnotationsWithAdd;
        annotations.add('highlight', epubHighlight.cfi, {}, undefined, highlight.color);
      }
    });
  }, [rendition, article.highlights]);
  
  // Remove type 'any' from function parameter
  const getSpineItemTitle = (hrefPath: string): string => {
    if (!book) return '';
    
    try {
      // Define proper type for spine item instead of using ts-expect-error
      type SpineItem = {
        href?: string;
        title?: string;
        [key: string]: unknown;
      };
      
      let title = '';
      // Use proper typed function for spine iteration
      const getSpineItems = book.spine as unknown as { 
        each: (callback: (item: SpineItem) => void) => void 
      };
      
      getSpineItems.each(function(item) {
        if (item.href === hrefPath) {
          title = item.title || '';
        }
      });
      return title;
    } catch (error) {
      console.error('Error getting spine item title:', error);
      return '';
    }
  };
  
  return (
    <div className={`
      fixed inset-0 
      bg-gray-900 text-white 
      flex flex-col h-screen
      pt-16
      ${isFullscreen ? 'z-50' : ''}
    `}>
      {/* Top Navigation Bar */}
      <div className="h-12 border-b border-gray-800 flex items-center justify-between px-4 bg-gray-900">
        <div className="flex items-center space-x-2">
          {/* Back to Library Button */}
          <Link to="/library" className="flex items-center space-x-1 p-1.5 rounded hover:bg-gray-800 text-gray-300">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to Library</span>
          </Link>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Favorite Button */}
          <button 
            className="p-1.5 rounded hover:bg-gray-800 text-gray-300"
            onClick={() => {
              if (onUpdateArticle) {
                onUpdateArticle({
                  ...article,
                  saved: !article.saved
                });
              }
            }}
            title={article.saved ? "Remove from favorites" : "Add to favorites"}
          >
            <Bookmark className={`h-4 w-4 ${article.saved ? 'fill-current text-pink-500' : ''}`} />
          </button>
          
          {/* Collapse Button */}
          <button 
            className="p-1.5 rounded hover:bg-gray-800 text-gray-300"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
          
          {/* Export Button */}
          <button className="p-1.5 rounded hover:bg-gray-800 text-gray-300" title="Export">
            <Download className="h-4 w-4" />
          </button>
          
          {/* Settings Button */}
          <button className="p-1.5 rounded hover:bg-gray-800 text-gray-300" title="Settings">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - TOC */}
        <div className="w-[250px] border-r border-gray-800 flex flex-col bg-gray-900 overflow-hidden">
          {/* Book Cover */}
          <div className="p-4 border-b border-gray-800">
            <div className="w-full aspect-[2/3] bg-gray-800 rounded overflow-hidden flex items-center justify-center relative">
              {coverUrl ? (
                <img 
                  src={coverUrl} 
                  alt={article.title} 
                  className="w-full h-full object-cover"
                />
              ) : article.imageUrl ? (
                <img 
                  src={article.imageUrl} 
                  alt={article.title} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-b from-blue-400/30 to-blue-600"></div>
              )}
              {(!coverUrl && !article.imageUrl) && (
                <div className="z-10 p-2 text-center">
                  <div className="text-sm font-medium text-white leading-tight">
                    {article.title}
                  </div>
                </div>
              )}
            </div>
            <h3 className="mt-3 text-sm font-medium leading-tight line-clamp-2">{article.title}</h3>
            {metadata.creator && <p className="text-xs text-gray-400 mt-1">{metadata.creator as string}</p>}
          </div>
          
          {/* Table of Contents */}
          <div className="flex-1 overflow-auto">
            <div className="p-2 border-b border-gray-800 flex items-center justify-between">
              <button 
                className="flex items-center w-full text-left text-sm font-medium px-2 py-1 hover:bg-gray-800 rounded-md"
                onClick={() => setTocExpanded(!tocExpanded)}
              >
                <Menu className="h-4 w-4 mr-2" />
                <span>Table of Contents</span>
                {tocExpanded ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
              </button>
            </div>
            
            {tocExpanded && (
              <div className="p-2">
                {tocItems.length === 0 ? (
                  <div className="text-sm text-gray-400 p-2">No table of contents available</div>
                ) : (
                  <div className="space-y-1">
                    {tocItems.map((item) => (
                      <button
                        key={item.id}
                        className={`text-sm text-left w-full px-2 py-1.5 rounded hover:bg-gray-800 truncate flex items-center ${
                          currentChapter === item.label ? 'bg-gray-800 text-pink-400' : 'text-gray-300'
                        }`}
                        style={{ paddingLeft: `${(item.level * 12) + 8}px` }}
                        onClick={() => navigateToTocItem(item.href)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Highlights Section */}
            {article.highlights && article.highlights.length > 0 && (
              <div className="p-2 mt-4">
                <div className="text-sm font-medium text-gray-400 px-2 py-1">HIGHLIGHTS</div>
                <div className="space-y-2 mt-2">
                  {article.highlights.map((highlight) => (
                    <div 
                      key={highlight.id} 
                      className="p-2 rounded-md bg-gray-800 hover:bg-gray-700 cursor-pointer"
                      onClick={() => {
                        if (highlight.cfi && rendition) {
                          rendition.display(highlight.cfi);
                        }
                      }}
                    >
                      <div className={`border-l-4 border-highlight-${highlight.color} pl-2 mb-1`}>
                        <p className="text-xs">{highlight.text}</p>
                      </div>
                      {highlight.note && (
                        <p className="text-xs text-gray-400 mt-1">{highlight.note}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col relative">
          {/* EPUB Toolbar */}
          <div className="h-12 border-b border-gray-800 flex items-center justify-between px-4 bg-gray-900">
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <button 
                  className="p-1.5 rounded hover:bg-gray-800 text-gray-300"
                  onClick={() => changeFontSize(-10)}
                  title="Decrease font size"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-sm text-gray-300">{fontSize}%</span>
                <button 
                  className="p-1.5 rounded hover:bg-gray-800 text-gray-300"
                  onClick={() => changeFontSize(10)}
                  title="Increase font size"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              
              <button 
                className="p-1.5 rounded hover:bg-gray-800 text-gray-300"
                title="Refresh"
              >
                <RotateCw className="h-4 w-4" />
              </button>
            </div>
            
            <div className="text-sm text-gray-300">
              {currentChapter ? currentChapter : 'Reading'}
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="bg-gray-800 text-white text-sm rounded-md px-2 py-1 w-32 focus:outline-none focus:ring-1 focus:ring-pink-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button 
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 p-0.5 rounded hover:bg-gray-700"
                  onClick={handleSearch}
                >
                  <Search className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
          
          {/* EPUB Content */}
          <div 
            className="flex-1 overflow-hidden bg-gray-900 relative"
          >
            {isLoading && (
              <div className="flex items-center justify-center h-full w-full absolute z-10 bg-gray-900/80">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
              </div>
            )}
            
            {error ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-background rounded-lg">
                <FileText className="h-14 w-14 text-destructive mb-4" />
                <h2 className="text-xl font-semibold mb-2">Error Loading EPUB</h2>
                <p className="text-muted-foreground mb-4">{error}</p>
                <p className="text-sm text-muted-foreground max-w-md">
                  The file may be corrupted or in an unsupported format. Try re-uploading the file or converting it to a standard EPUB format.
                </p>
                <button 
                  onClick={() => window.history.back()}
                  className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  Go Back
                </button>
              </div>
            ) : (
              <div 
                ref={viewerRef} 
                className="h-full w-full"
              />
            )}
            
            {/* Search Results Indicator */}
            {searchResults.length > 0 && (
              <div className="absolute left-1/2 transform -translate-x-1/2 top-4 bg-gray-800 rounded-md p-2 flex items-center space-x-2 z-20">
                <button 
                  onClick={() => navigateSearchResults('prev')}
                  className="p-1 rounded hover:bg-gray-700"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm">
                  {currentSearchIndex + 1} of {searchResults.length}
                </span>
                <button 
                  onClick={() => navigateSearchResults('next')}
                  className="p-1 rounded hover:bg-gray-700"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => {
                    setSearchResults([]);
                    setSearchQuery('');
                  }}
                  className="p-1 rounded hover:bg-gray-700 ml-2"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            
            {/* Highlight Menu */}
            {showHighlightMenu && textSelection && (
              <div 
                className="absolute z-50 bg-gray-800 rounded-md shadow-lg p-2 flex items-center space-x-1"
                style={{ 
                  top: textSelection.y - 40, 
                  left: textSelection.x - 100
                }}
              >
                {/* Highlight color buttons */}
                <button 
                  className="w-6 h-6 rounded-full bg-yellow-300 hover:ring-2 ring-white"
                  onClick={() => handleHighlight('yellow')}
                />
                <button 
                  className="w-6 h-6 rounded-full bg-blue-300 hover:ring-2 ring-white"
                  onClick={() => handleHighlight('blue')}
                />
                <button 
                  className="w-6 h-6 rounded-full bg-green-300 hover:ring-2 ring-white"
                  onClick={() => handleHighlight('green')}
                />
                <button 
                  className="w-6 h-6 rounded-full bg-pink-300 hover:ring-2 ring-white"
                  onClick={() => handleHighlight('pink')}
                />
                <button 
                  className="w-6 h-6 rounded-full bg-purple-300 hover:ring-2 ring-white"
                  onClick={() => handleHighlight('purple')}
                />
                <button 
                  className="ml-2 p-1 rounded hover:bg-gray-700"
                  onClick={() => setShowHighlightMenu(false)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          
          {/* Bottom Navigation */}
          <div className="h-12 border-t border-gray-800 flex items-center justify-between px-4 bg-gray-900">
            <button 
              className="flex items-center space-x-1 text-sm text-gray-300"
              onClick={goToPrevPage}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>
            
            <div className="text-sm text-gray-300">
              {loadingLocations ? (
                <span className="flex items-center">
                  <div className="h-3 w-3 rounded-full border-2 border-t-pink-400 border-pink-400/30 animate-spin mr-2"></div>
                  Calculating pages...
                </span>
              ) : (
                <span>Page {currentPage + 1} of {totalPages || '?'}</span>
              )}
            </div>
            
            <button 
              className="flex items-center space-x-1 text-sm text-gray-300"
              onClick={goToNextPage}
            >
              <span>Next</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Right Sidebar - Info Panel */}
        <div className="w-[250px] border-l border-gray-800 flex flex-col bg-gray-900">
          <div className="h-12 border-b border-gray-800 flex items-center justify-between px-4">
            <div className="flex items-center space-x-2">
              <Info className="h-5 w-5 text-gray-300" />
              <span className="font-medium text-gray-300">Book Info</span>
            </div>
            <button 
              className="p-1 rounded hover:bg-gray-800"
              onClick={() => setInfoExpanded(!infoExpanded)}
            >
              {infoExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
          
          {infoExpanded && (
            <div className="flex-1 overflow-auto">
              <div className="p-4 border-b border-gray-800">
                <h2 className="text-lg font-medium text-gray-100">{article.title}</h2>
                {metadata.creator && (
                  <div className="text-sm text-gray-400 mt-1">{metadata.creator as string}</div>
                )}
              </div>
              
              {metadata.description && (
                <div className="p-4 border-b border-gray-800">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">DESCRIPTION</h3>
                  <p className="text-sm text-gray-300 line-clamp-6">{metadata.description as string}</p>
                </div>
              )}
              
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-4">METADATA</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Format</span>
                    <span className="text-sm text-gray-300">EPUB</span>
                  </div>
                  
                  {metadata.publisher && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Publisher</span>
                      <span className="text-sm text-gray-300">{metadata.publisher as string}</span>
                    </div>
                  )}
                  
                  {metadata.pubdate && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Published</span>
                      <span className="text-sm text-gray-300">
                        {metadata.pubdate && typeof metadata.pubdate === 'string' ? 
                          new Date(metadata.pubdate).getFullYear() : 'Unknown'}
                      </span>
                    </div>
                  )}
                  
                  {totalPages > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Pages</span>
                      <span className="text-sm text-gray-300">{totalPages}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Added</span>
                    <span className="text-sm text-gray-300">{new Date(article.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Note Dialog */}
      {showNoteDialog && currentHighlight && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-4 w-full max-w-md">
            <h3 className="text-lg font-medium mb-2">Add Note to Highlight</h3>
            <div className={`border-l-4 border-highlight-${currentHighlight.color} pl-2 mb-4 py-1`}>
              <p className="text-sm">{currentHighlight.text}</p>
            </div>
            <textarea 
              className="w-full p-2 rounded bg-gray-700 text-white mb-4 focus:outline-none focus:ring-2 focus:ring-pink-500"
              rows={4}
              placeholder="Add your note here..."
              defaultValue={currentHighlight.note || ''}
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button 
                className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
                onClick={() => {
                  setShowNoteDialog(false);
                  setCurrentHighlight(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 rounded bg-pink-600 hover:bg-pink-500"
                onClick={(e) => {
                  const textarea = e.currentTarget.parentElement?.previousElementSibling as HTMLTextAreaElement;
                  if (textarea) {
                    handleAddNote(textarea.value);
                  }
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedEpubReader; 