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
  ChevronRight
} from 'lucide-react';
import ePub from 'epubjs';
import Book from 'epubjs/types/book';
import Rendition from 'epubjs/types/rendition';
import Contents from 'epubjs/types/contents';
import Navigation from 'epubjs/types/navigation';
import { v4 as uuidv4 } from 'uuid';

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

interface TextSelectionPosition {
  x: number;
  y: number;
  text: string;
  cfi?: string;
}

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
  const [metadata, setMetadata] = useState<any>({});
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [currentChapter, setCurrentChapter] = useState<string>('');
  
  // Selection and highlights
  const [textSelection, setTextSelection] = useState<TextSelectionPosition | null>(null);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [currentHighlight, setCurrentHighlight] = useState<Highlight | null>(null);
  
  // Search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  
  // Refs
  const viewerRef = useRef<HTMLDivElement>(null);
  
  // Initialize the EPUB reader
  const initializeReader = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      
      if (!viewerRef.current) return;
      
      // Initialize the book
      const epubBook = ePub(article.url);
      setBook(epubBook);
      
      // Get metadata
      epubBook.loaded.metadata.then(meta => {
        setMetadata(meta);
      });
      
      // Get cover image
      epubBook.loaded.cover.then(coverUrl => {
        if (coverUrl) {
          epubBook.archive.createUrl(coverUrl, { base64: true }).then(url => {
            setCoverUrl(url);
          });
        }
      });
      
      // Get TOC
      epubBook.loaded.navigation.then((nav: Navigation) => {
        const processNavItems = (items: any[], level = 0): NavItem[] => {
          return items.map(item => ({
            id: uuidv4(),
            href: item.href,
            label: item.label,
            subitems: item.subitems ? processNavItems(item.subitems, level + 1) : undefined,
            level
          }));
        };
        
        if (nav.toc) {
          setTocItems(processNavItems(nav.toc));
        }
      });
      
      // Create rendition
      const rendition = epubBook.renderTo(viewerRef.current, {
        width: '100%',
        height: '100%',
        flow: 'paginated',
        allowScriptedContent: false,
        ignoreClass: 'annotator-hl'
      });
      
      // Apply font size
      rendition.themes.fontSize(`${fontSize}%`);
      
      // Apply color theme based on system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      rendition.themes.register("light", { 
        body: { 
          color: "#000", 
          background: "#fff",
          "font-family": "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
          "line-height": "1.6",
        } 
      });
      rendition.themes.register("dark", { 
        body: { 
          color: "#fff", 
          background: "#121212",
          "font-family": "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
          "line-height": "1.6",
        } 
      });
      rendition.themes.select(prefersDark ? "dark" : "light");
      
      setRendition(rendition);
      
      // Display book
      await rendition.display();
      
      // Set up event listeners
      rendition.on('relocated', (location: any) => {
        const pageNumber = location.start.location || location.start.index || 0;
        setCurrentPage(pageNumber);
        
        // Get current chapter title
        // @ts-ignore - epubjs spine API not fully typed
        const spineItem = epubBook.spine.get(location.start.href);
        if (spineItem && typeof spineItem.then === 'function') {
          // @ts-ignore - promise API
          spineItem.then((item: any) => {
            if (item && item.title) {
              setCurrentChapter(item.title);
            }
          });
        }
      });
      
      // Set up selection event
      rendition.on('selected', (cfiRange: string, contents: Contents) => {
        if (rendition.getRange(cfiRange)) {
          const range = rendition.getRange(cfiRange);
          if (range) {
            const text = contents.window.getSelection()?.toString() || '';
            const rect = range.getBoundingClientRect();
            
            setTextSelection({
              x: rect.left + rect.width / 2,
              y: rect.top,
              text,
              cfi: cfiRange
            });
            
            setShowHighlightMenu(true);
          }
        }
      });
      
      // Loading complete
      setIsLoading(false);
      
      // Generate locations in the background
      setTimeout(() => {
        generateLocations(epubBook);
      }, 1000);
    } catch (error) {
      console.error('Error initializing EPUB reader:', error);
      setIsLoading(false);
      setError(error instanceof Error ? error.message : 'Failed to load the EPUB book');
    }
  }, [article.url, fontSize]);
  
  // Generate locations for page numbers
  const generateLocations = useCallback(async (book: Book) => {
    if (!book) return;
    
    setLoadingLocations(true);
    
    try {
      // Use a smaller number for faster processing
      await book.locations.generate(512);
      
      // @ts-ignore - epubjs locations API not fully typed
      const totalLoc = book.locations.total || 1;
      setTotalPages(totalLoc);
      setLoadingLocations(false);
    } catch (error) {
      console.error('Error generating EPUB locations:', error);
      setLoadingLocations(false);
      setTotalPages(1); // Default fallback
    }
  }, []);
  
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
    
    const newHighlight: EPubHighlight = {
      id: uuidv4(),
      articleId: article.id,
      text: textSelection.text,
      color: color as any,
      createdAt: new Date().toISOString(),
      cfi: textSelection.cfi
    };
    
    // Add highlight to the DOM
    if (textSelection.cfi) {
      // @ts-ignore - Using direct annotation API
      rendition.annotations.add('highlight', textSelection.cfi, {}, undefined, color);
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
      // @ts-ignore - epubjs search is not in the types
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
      // @ts-ignore - Using direct annotation API
      rendition.annotations.clear && rendition.annotations.clear();
    } catch (error) {
      console.error('Error clearing highlights:', error);
    }
    
    // Apply all saved highlights
    article.highlights.forEach(highlight => {
      // Cast to our extended type to access the cfi property
      const epubHighlight = highlight as EPubHighlight;
      if (epubHighlight.cfi) {
        // @ts-ignore - Using direct annotation API
        rendition.annotations.add('highlight', epubHighlight.cfi, {}, undefined, highlight.color);
      }
    });
  }, [rendition, article.highlights]);
  
  return (
    <div className={`
      fixed inset-0 
      bg-gray-900 text-white 
      flex flex-col h-screen
      pt-16
      ${isFullscreen ? 'z-50' : ''}
    `}>
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
            {metadata.creator && <p className="text-xs text-gray-400 mt-1">{metadata.creator}</p>}
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
            {article.highlights.length > 0 && (
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
              <button className="p-1.5 rounded hover:bg-gray-800 text-gray-300">
                <ArrowLeft className="h-4 w-4" />
              </button>
              
              <div className="flex items-center space-x-1">
                <button 
                  className="p-1.5 rounded hover:bg-gray-800 text-gray-300"
                  onClick={() => changeFontSize(-10)}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-sm text-gray-300">{fontSize}%</span>
                <button 
                  className="p-1.5 rounded hover:bg-gray-800 text-gray-300"
                  onClick={() => changeFontSize(10)}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              
              {/* Fullscreen Toggle */}
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
              
              <button className="p-1.5 rounded hover:bg-gray-800 text-gray-300">
                <RotateCw className="h-4 w-4" />
              </button>
              <button className="p-1.5 rounded hover:bg-gray-800 text-gray-300">
                <Download className="h-4 w-4" />
              </button>
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
              <div className="flex items-center justify-center h-full w-full text-center p-4">
                <div>
                  <p className="text-red-500 mb-2">{error}</p>
                  <button 
                    onClick={initializeReader}
                    className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
                  >
                    Try Again
                  </button>
                </div>
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
                  <div className="text-sm text-gray-400 mt-1">{metadata.creator}</div>
                )}
              </div>
              
              {metadata.description && (
                <div className="p-4 border-b border-gray-800">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">DESCRIPTION</h3>
                  <p className="text-sm text-gray-300 line-clamp-6">{metadata.description}</p>
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
                      <span className="text-sm text-gray-300">{metadata.publisher}</span>
                    </div>
                  )}
                  
                  {metadata.pubdate && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Published</span>
                      <span className="text-sm text-gray-300">{new Date(metadata.pubdate).getFullYear()}</span>
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