import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Article, Highlight } from '@/lib/types';
import { ArrowLeft, Bookmark, Share2, MoreHorizontal, Clock, X, Tag, MessageSquare, FileIcon as FileIconLucide, BookIcon, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, ChevronLeftSquare, ChevronRightSquare, Maximize2, Minimize2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import NoteDialog from './NoteDialog';
import TagDialog from './TagDialog';
import ePub from 'epubjs';
import PDFReader from './PDFReader';
import EnhancedEpubReader from './EnhancedEpubReader';
import { Book, Rendition } from 'epubjs';

interface ReaderProps {
  article: Article;
  onUpdateArticle?: (article: Article) => void;
}

interface HighlightMenuProps {
  position: { x: number; y: number } | null;
  onHighlight: (color: string) => void;
  onAddNote?: () => void;
  onAddTags?: () => void;
  onClose: () => void;
}

const HighlightMenu: React.FC<HighlightMenuProps> = ({ position, onHighlight, onAddNote, onAddTags, onClose }) => {
  if (!position) return null;

  const colors = [
    { name: 'yellow', class: 'bg-highlight-yellow' },
    { name: 'blue', class: 'bg-highlight-blue' },
    { name: 'green', class: 'bg-highlight-green' },
    { name: 'pink', class: 'bg-highlight-pink' },
    { name: 'purple', class: 'bg-highlight-purple' },
    { name: 'orange', class: 'bg-highlight-orange' },
    { name: 'red', class: 'bg-highlight-red' },
    { name: 'teal', class: 'bg-highlight-teal' },
  ] as const;

  return (
    <div
      className="fixed z-50 bg-background rounded-lg shadow-lg border p-2 flex items-center gap-1 flex-wrap max-w-sm"
      style={{ top: position.y + 10, left: position.x }}
    >
      <div className="flex flex-wrap gap-1 p-1">
        {colors.map((color) => (
          <button
            key={color.name}
            className={`w-6 h-6 rounded-full ${color.class} hover:ring-2 ring-offset-2`}
            onClick={() => onHighlight(color.name)}
            title={color.name.charAt(0).toUpperCase() + color.name.slice(1)}
          />
        ))}
      </div>
      <div className="w-px h-6 bg-border mx-1" />
      <div className="flex items-center gap-1">
        <button
          className="p-1.5 hover:bg-secondary rounded-md"
          onClick={onAddNote}
          title="Add note"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
        <button
          className="p-1.5 hover:bg-secondary rounded-md"
          onClick={onAddTags}
          title="Add tags"
        >
          <Tag className="w-4 h-4" />
        </button>
        <button
          className="p-1.5 hover:bg-secondary rounded-md"
          onClick={onClose}
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// EPUB Reader component
const EpubReader = ({ url, title }: { url: string, title: string }) => {
  const [locations, setLocations] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [fontSize, setFontSize] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [epub, setEpub] = useState<Book | null>(null);
  const [rendition, setRendition] = useState<Rendition | null>(null);
  const [selection, setSelection] = useState<unknown | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const bookRef = useRef<HTMLDivElement>(null);

  const generateLocations = useCallback(async (book: Book) => {
    if (!book) return;
    
    setIsLoading(true);
    
    try {
      console.log("Generating EPUB locations in background...");
      
      // Use a smaller number for faster processing
      // Use type assertion to access the generate method
      const bookLocations = book.locations as unknown as { generate: (spineItems?: number) => Promise<void> };
      await bookLocations.generate(512);
      
      // Use type assertion to access the total property
      const locationsWithTotal = book.locations as unknown as { total: number };
      const totalLoc = locationsWithTotal.total || 1;
      console.log("EPUB locations generated, total pages:", totalLoc);
      
      setPages(totalLoc);
      setIsLoading(false);
    } catch (error) {
      console.error("Error generating locations:", error);
      setIsLoading(false);
    }
  }, []);

  const initializeReader = useCallback(async () => {
    if (!url) return;
    
    try {
      // Initialize book
      const book = ePub(url);
      setEpub(book);
      
      // Create rendition
      const rendition = book.renderTo("book", {
        width: "100%",
        height: "100%",
        flow: "paginated",
        spread: "none",
        minSpreadWidth: 900,
      });
      setRendition(rendition);
      
      // Display
      rendition.display();
      
      // Handle selection
      rendition.on("selected", (cfiRange: string, contents: unknown) => {
        setSelection({
          cfi: cfiRange,
          text: rendition.getRange(cfiRange).toString()
        });
      });
      
      // Generate locations for pagination
      await generateLocations(book);
      
      // Handle loaded
      rendition.on("rendered", () => {
        setIsLoading(false);
      });
      
      // Handle errors
      book.on("openFailed", (error: Error) => {
        setError(`Failed to open: ${error.message}`);
        setIsLoading(false);
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load book');
      setIsLoading(false);
    }
  }, [url, generateLocations]);
  
  useEffect(() => {
    let mounted = true;
    
    // Start initialization
    initializeReader();
    
    // Cleanup function
    return () => {
      mounted = false;
      if (epub) {
        try {
          console.log("Destroying EPUB book instance");
          epub.destroy();
        } catch (err) {
          console.error("Error destroying EPUB instance:", err);
        }
      }
    };
  }, [initializeReader, epub]);
  
  const changeFontSize = (delta: number) => {
    const newSize = Math.max(50, Math.min(200, fontSize + delta));
    setFontSize(newSize);
    
    if (rendition) {
      rendition.themes.fontSize(`${newSize}%`);
    }
  };
  
  const resetFontSize = () => {
    setFontSize(100);
    if (rendition) {
      rendition.themes.fontSize('100%');
    }
  };
  
  const goToPrevPage = () => {
    if (rendition) {
      rendition.prev();
    }
  };
  
  const goToNextPage = () => {
    if (rendition) {
      rendition.next();
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
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
    }
  };
  
  // Touch event handlers for swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    // Touch event handling is not implemented in the new EpubReader component
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    // Touch event handling is not implemented in the new EpubReader component
  };
  
  // Function to retry loading on error
  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    initializeReader();
  };

  return (
    <div 
      className="flex flex-col w-full"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="bg-background rounded-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <BookIcon className="h-6 w-6 text-primary" />
          <h3 className="text-lg font-medium flex-grow text-center">{title}</h3>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-[80vh]">
            <div className="animate-pulse text-center">
              <div className="h-8 w-8 rounded-full border-4 border-t-primary border-primary/30 animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading EPUB book...</p>
              <p className="text-xs text-muted-foreground mt-2">This may take a moment for large books</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col justify-center items-center h-[80vh]">
            <div className="text-center max-w-md">
              <BookIcon className="h-12 w-12 text-destructive mx-auto mb-4 opacity-80" />
              <h3 className="text-lg font-medium mb-2">Error Loading Book</h3>
              <p className="text-muted-foreground mb-6">{error}</p>
              <div className="flex space-x-4 justify-center">
                <button
                  onClick={handleRetry}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-center items-center gap-2 mb-2">
              <button
                onClick={() => changeFontSize(-10)}
                className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground"
                aria-label="Decrease font size"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                onClick={resetFontSize}
                className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground"
                aria-label="Reset font size"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={() => changeFontSize(10)}
                className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground"
                aria-label="Increase font size"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <span className="text-xs text-muted-foreground">{fontSize}%</span>
            </div>
            
            <div 
              ref={bookRef} 
              className="w-full h-[80vh] border rounded-lg bg-white dark:bg-zinc-900"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            />
            
            <div className="flex justify-between items-center mt-4">
              <button
                onClick={goToPrevPage}
                className="p-2 rounded-full hover:bg-secondary transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              <div className="text-sm text-muted-foreground">
                {isLoading ? (
                  <span className="flex items-center">
                    <div className="h-3 w-3 rounded-full border-2 border-t-primary border-primary/30 animate-spin mr-2"></div>
                    Calculating pages...
                  </span>
                ) : (
                  <span>Page {page} of {pages || '?'}</span>
                )}
              </div>
              
              <button
                onClick={goToNextPage}
                className="p-2 rounded-full hover:bg-secondary transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mt-3 text-xs text-center text-muted-foreground">
              <p>
                Keyboard shortcuts: Arrow keys to navigate, + and - to adjust font size, 0 to reset font size
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Helper to render file view based on source type
const FileViewer = ({ article }: { article: Article }) => {
  // State for text fullscreen mode
  const [isTextFullscreen, setIsTextFullscreen] = useState(false);

  if (article.source === 'PDF') {
    // Use the PDF reader component
    return <PDFReader article={article} />;
  } else if (article.source === 'EPUB') {
    // Use the enhanced EPUB reader component with immersive mode
    return <EnhancedEpubReader article={article} />;
  } else if (article.source === 'Text' || article.source === 'Note') {
    // Enhanced text viewer with immersive mode
    return (
      <div 
        className={`transition-all duration-300 ease-in-out ${
          isTextFullscreen ? 'fixed inset-0 z-50 bg-background overflow-auto' : 'w-full'
        }`}
      >
        <div className={`${isTextFullscreen ? 'sticky top-0 z-10 backdrop-blur-md bg-background/70' : ''}`}>
          <div className="flex justify-between items-center p-4">
            <div className="flex items-center">
              <FileIconLucide className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-medium ml-2">{article.title}</h3>
            </div>
            
            <button 
              onClick={() => setIsTextFullscreen(!isTextFullscreen)}
              className="p-2 rounded-full hover:bg-secondary/80 transition-colors"
              title={isTextFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isTextFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>
          </div>
        </div>
        
        <div className={`prose prose-lg prose-slate max-w-none dark:prose-invert bg-white dark:bg-zinc-900 p-8 rounded-lg ${
          isTextFullscreen ? 'min-h-screen' : 'min-h-[80vh]'
        }`}>
          {!article.content ? (
            <div className="flex justify-center items-center h-[70vh]">
              <div className="animate-pulse text-center">
                <div className="h-8 w-8 rounded-full border-4 border-t-primary border-primary/30 animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading content...</p>
              </div>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap overflow-x-auto">{article.content}</pre>
          )}
        </div>
      </div>
    );
  } else if (article.source === 'Web') {
    // For web content or any other type, use the standard article display
    return null;
  } else {
    // Unknown file type - simplified view
    return (
      <div className="w-full h-full flex flex-col items-center">
        <div className="bg-background w-full text-center">
          <FileIconLucide className="h-10 w-10 mx-auto mb-2 text-primary" />
          <h3 className="text-lg font-medium mb-2">{article.source} File</h3>
          <p className="text-muted-foreground mb-4">This file type may not be viewable in the browser.</p>
        </div>
      </div>
    );
  }
};

const Reader = ({ article, onUpdateArticle }: ReaderProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [saved, setSaved] = useState(article.saved);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [highlights, setHighlights] = useState<Highlight[]>(article.highlights || []);
  const [activeHighlight, setActiveHighlight] = useState<Highlight | null>(null);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Show highlighting only for Web content
  const supportsHighlighting = article.source === 'Web' || article.source === 'Text' || article.source === 'Note';

  // Sync highlights with article prop
  useEffect(() => {
    setHighlights(article.highlights || []);
  }, [article.highlights]);

  const applyHighlights = useCallback(() => {
    if (!contentRef.current) return;

    // Remove existing highlight spans
    const existingHighlights = contentRef.current.getElementsByClassName('highlight');
    while (existingHighlights.length > 0) {
      const el = existingHighlights[0];
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) {
          parent.insertBefore(el.firstChild, el);
        }
        parent.removeChild(el);
      }
    }

    // Create a TreeWalker to iterate through text nodes
    const walker = document.createTreeWalker(
      contentRef.current,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip text nodes that are already inside highlights
          if (node.parentElement?.closest('.highlight')) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nodesToHighlight: { node: Node; highlight: Highlight; startIndex: number }[] = [];
    let node: Node | null;
    
    // Find all text nodes that contain highlight text
    while ((node = walker.nextNode())) {
      const nodeText = node.textContent || '';
      
      highlights.forEach(highlight => {
        let index = nodeText.indexOf(highlight.text);
        while (index !== -1) {
          nodesToHighlight.push({ 
            node, 
            highlight,
            startIndex: index
          });
          index = nodeText.indexOf(highlight.text, index + 1);
        }
      });
    }

    // Sort highlights by their position in reverse order
    nodesToHighlight.sort((a, b) => {
      if (a.node !== b.node) {
        return 0; // Different nodes, maintain relative order
      }
      return b.startIndex - a.startIndex; // Same node, apply from end to start
    });

    // Apply highlights
    nodesToHighlight.forEach(({ node, highlight, startIndex }) => {
      try {
        const range = document.createRange();
        range.setStart(node, startIndex);
        range.setEnd(node, startIndex + highlight.text.length);

        const span = document.createElement('span');
        span.className = `highlight highlight-${highlight.color}`;
        span.dataset.highlightId = highlight.id;
        
        // Preserve any existing inline styles or classes from parent elements
        const parentStyles = Array.from(node.parentElement?.classList || [])
          .filter(className => !className.includes('highlight'))
          .join(' ');
        if (parentStyles) {
          span.className += ` ${parentStyles}`;
        }

        range.surroundContents(span);
      } catch (error) {
        console.error('Failed to apply highlight:', error);
      }
    });
  }, [highlights]);

  useEffect(() => {
    // Apply existing highlights to the content
    if (supportsHighlighting) {
      applyHighlights();
    }
  }, [applyHighlights, supportsHighlighting]);

  const handleHighlight = () => {
    if (!supportsHighlighting) return;
    
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setMenuPosition(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    setSelectedText(selection.toString());
    setMenuPosition({
      x: rect.left + (rect.width / 2) - 100, // Center the menu
      y: rect.top - 10,
    });
  };

  const createHighlight = (color: 'yellow' | 'blue' | 'green' | 'pink' | 'purple' | 'orange' | 'red' | 'teal') => {
    const newHighlight: Highlight = {
      id: uuidv4(),
      articleId: article.id,
      text: selectedText,
      color,
      createdAt: new Date().toISOString(),
    };

    const updatedHighlights = [...highlights, newHighlight];
    setHighlights(updatedHighlights);
    setMenuPosition(null);
    
    if (onUpdateArticle) {
      onUpdateArticle({
        ...article,
        highlights: updatedHighlights,
      });
    }
  };

  const handleAddNote = () => {
    setActiveHighlight({
      id: uuidv4(),
      articleId: article.id,
      text: selectedText,
      color: 'yellow',
      createdAt: new Date().toISOString(),
    });
    setShowNoteDialog(true);
    setMenuPosition(null);
  };

  const handleAddTags = () => {
    setActiveHighlight({
      id: uuidv4(),
      articleId: article.id,
      text: selectedText,
      color: 'yellow',
      createdAt: new Date().toISOString(),
    });
    setShowTagDialog(true);
    setMenuPosition(null);
  };

  const handleSaveHighlight = (highlight: Highlight) => {
    const existingIndex = highlights.findIndex(h => h.id === highlight.id);
    let updatedHighlights: Highlight[];
    
    if (existingIndex >= 0) {
      updatedHighlights = [
        ...highlights.slice(0, existingIndex),
        highlight,
        ...highlights.slice(existingIndex + 1),
      ];
    } else {
      updatedHighlights = [...highlights, highlight];
    }
    
    setHighlights(updatedHighlights);
    setShowNoteDialog(false);
    setShowTagDialog(false);
    setActiveHighlight(null);
    
    if (onUpdateArticle) {
      onUpdateArticle({
        ...article,
        highlights: updatedHighlights,
      });
    }
  };

  const exportHighlights = () => {
    const exportData = {
      articleTitle: article.title,
      articleUrl: article.url,
      highlights: highlights.map(h => ({
        text: h.text,
        note: h.note,
        tags: h.tags,
        color: h.color,
        createdAt: h.createdAt,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `highlights-${article.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Update the saved status when it changes
  useEffect(() => {
    if (article.saved !== saved && onUpdateArticle) {
      onUpdateArticle({
        ...article,
        saved
      });
    }
  }, [saved, article, onUpdateArticle]);

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Add CSS class for reader fullscreen mode when component mounts
  useEffect(() => {
    // Add the CSS style to head when the component mounts
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
      .reader-fullscreen-mode {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        z-index: 50 !important;
        background: var(--background) !important;
        overflow: auto !important;
      }
    `;
    document.head.appendChild(styleElement);

    // Clean up the style when component unmounts
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Don't show the reader header or other elements when viewing PDFs
  if (article.source === 'PDF') {
    return <PDFReader article={article} />;
  }

  return (
    <div className={`min-h-screen flex flex-col ${isFullscreen ? 'reader-fullscreen-mode' : ''}`}>
      {/* Reader Header - minimalist design similar to Readwise */}
      <div className={`sticky top-0 z-40 glass backdrop-blur-md border-b transition-opacity duration-200 ${isFullscreen ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center text-sm font-medium p-1 -ml-1 rounded-md hover:bg-secondary transition-colors">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            <span>Library</span>
          </Link>
          
          <div className="flex items-center space-x-1">
            <button 
              className="p-2 rounded-full hover:bg-secondary transition-colors"
              onClick={() => setSaved(!saved)}
              title={saved ? "Saved" : "Save"}
            >
              <Bookmark className={`h-5 w-5 ${saved ? 'fill-current' : ''}`} />
            </button>
            <button 
              className="p-2 rounded-full hover:bg-secondary transition-colors"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <ChevronLeftSquare className="h-5 w-5" /> : <ChevronRightSquare className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Article Content - Full-page reading experience */}
      <div className={`flex-grow py-8 px-4 ${isFullscreen ? 'px-0 py-0' : ''}`}>
        <div className={`container mx-auto ${isFullscreen ? 'max-w-none mx-0' : 'max-w-4xl'}`}>
          <FileViewer article={article} />
        </div>
      </div>

      {supportsHighlighting && (
        <HighlightMenu
          position={menuPosition}
          onHighlight={createHighlight}
          onAddNote={handleAddNote}
          onAddTags={handleAddTags}
          onClose={() => setMenuPosition(null)}
        />
      )}

      {showNoteDialog && activeHighlight && (
        <NoteDialog
          highlight={activeHighlight}
          onSave={handleSaveHighlight}
          onClose={() => {
            setShowNoteDialog(false);
            setActiveHighlight(null);
          }}
        />
      )}

      {showTagDialog && activeHighlight && (
        <TagDialog
          highlight={activeHighlight}
          onSave={handleSaveHighlight}
          onClose={() => {
            setShowTagDialog(false);
            setActiveHighlight(null);
          }}
          availableTags={article.tags}
        />
      )}
    </div>
  );
};

export default Reader;
