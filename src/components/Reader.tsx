import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Article, Highlight } from '@/lib/types';
import { ArrowLeft, Bookmark, Share2, MoreHorizontal, Clock, X, Tag, Download, MessageSquare, FileIcon as FileIconLucide, BookIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import NoteDialog from './NoteDialog';
import TagDialog from './TagDialog';
import ePub from 'epubjs';

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
  const viewerRef = useRef<HTMLDivElement>(null);
  const [book, setBook] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    let rendition: any;
    let mounted = true;
    
    const initializeReader = async () => {
      try {
        if (!viewerRef.current) return;
        
        // Initialize the book
        const epubBook = ePub(url);
        if (mounted) setBook(epubBook);
        
        // Initialize the rendition
        rendition = epubBook.renderTo(viewerRef.current, {
          width: '100%',
          height: '100%',
          spread: 'auto'
        });
        
        // Display the book
        await rendition.display();
        
        // Get total pages - using type assertion since the epubjs types might be incomplete
        const totalLoc = (epubBook.locations as any).total;
        if (mounted) setTotalPages(totalLoc || 1);
        
        // Set up event listeners
        rendition.on('relocated', (location: any) => {
          if (mounted) {
            setCurrentPage(location.start.location);
            setIsLoading(false);
          }
        });
        
        // Generate locations for page numbers
        await epubBook.locations.generate(1024);
      } catch (error) {
        console.error("Error loading EPUB:", error);
        if (mounted) setIsLoading(false);
      }
    };
    
    initializeReader();
    
    return () => {
      mounted = false;
      if (book) {
        book.destroy();
      }
    };
  }, [url]);
  
  const goToPrevPage = () => {
    if (book && book.rendition) {
      book.rendition.prev();
    }
  };
  
  const goToNextPage = () => {
    if (book && book.rendition) {
      book.rendition.next();
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      goToPrevPage();
    } else if (e.key === 'ArrowRight') {
      goToNextPage();
    }
  };
  
  return (
    <div 
      className="flex flex-col w-full"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="bg-secondary/20 rounded-lg p-4 mb-6 w-full">
        <div className="flex justify-between items-center mb-4">
          <BookIcon className="h-6 w-6 text-primary" />
          <h3 className="text-lg font-medium flex-grow text-center">{title}</h3>
          <a 
            href={url}
            className="text-primary hover:underline text-sm"
            download={title}
            target="_blank"
            rel="noopener noreferrer"
          >
            Download
          </a>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-[70vh]">
            <div className="animate-pulse text-center">
              <div className="h-8 w-8 rounded-full border-4 border-t-primary border-primary/30 animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading EPUB book...</p>
            </div>
          </div>
        ) : (
          <>
            <div 
              ref={viewerRef} 
              className="w-full h-[70vh] border rounded-lg bg-white dark:bg-zinc-900"
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
                Page {currentPage + 1} of {totalPages}
              </div>
              
              <button
                onClick={goToNextPage}
                className="p-2 rounded-full hover:bg-secondary transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Helper to render file view based on source type
const FileViewer = ({ article }: { article: Article }) => {
  if (article.source === 'PDF') {
    return (
      <div className="w-full h-full flex flex-col items-center">
        <div className="bg-secondary/20 rounded-lg p-4 mb-6 w-full text-center">
          <FileIconLucide className="h-10 w-10 mx-auto mb-2 text-primary" />
          <h3 className="text-lg font-medium mb-2">PDF File</h3>
          <p className="text-muted-foreground mb-4">You're viewing a PDF file that was uploaded.</p>
          <iframe 
            src={article.url} 
            className="w-full h-[75vh] border rounded-lg"
            title={article.title}
          />
        </div>
      </div>
    );
  } else if (article.source === 'Book') {
    // Use the new EPUB reader component
    return <EpubReader url={article.url} title={article.title} />;
  } else if (article.source === 'Text' || article.source === 'Note') {
    // For text files, we can display the content directly
    return (
      <div className="prose prose-lg prose-slate max-w-none">
        <pre className="whitespace-pre-wrap overflow-x-auto p-4 bg-secondary/20 rounded-lg">
          {article.content}
        </pre>
      </div>
    );
  } else if (article.source === 'Web') {
    // For web content or any other type, use the standard article display
    return null;
  } else {
    // Unknown file type - provide download link
    return (
      <div className="w-full h-full flex flex-col items-center">
        <div className="bg-secondary/20 rounded-lg p-4 mb-6 w-full text-center">
          <FileIconLucide className="h-10 w-10 mx-auto mb-2 text-primary" />
          <h3 className="text-lg font-medium mb-2">{article.source} File</h3>
          <p className="text-muted-foreground mb-4">This file type may not be viewable in the browser.</p>
          <a 
            href={article.url}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md inline-block"
            download={article.title}
            target="_blank"
            rel="noopener noreferrer"
          >
            Download File
          </a>
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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Reader Header */}
      <div className="sticky top-0 z-40 glass backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center text-sm font-medium p-1 -ml-1 rounded-md hover:bg-secondary transition-colors">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            <span>Library</span>
          </Link>
          
          <div className="flex items-center space-x-1">
            <button 
              className="p-2 rounded-full hover:bg-secondary transition-colors"
              onClick={() => setSaved(!saved)}
            >
              <Bookmark className={`h-5 w-5 ${saved ? 'fill-current' : ''}`} />
            </button>
            {supportsHighlighting && (
              <button 
                className="p-2 rounded-full hover:bg-secondary transition-colors"
                onClick={exportHighlights}
                title="Export highlights"
              >
                <Download className="h-5 w-5" />
              </button>
            )}
            <button className="p-2 rounded-full hover:bg-secondary transition-colors">
              <Share2 className="h-5 w-5" />
            </button>
            <button className="p-2 rounded-full hover:bg-secondary transition-colors">
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Article Content */}
      <div className="flex-1 pb-20">
        <div className="max-w-2xl mx-auto px-4 pt-8 pb-16">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3 text-balance">
              {article.title}
            </h1>
            
            <div className="flex flex-wrap items-center text-sm text-muted-foreground mb-4">
              {article.author && (
                <span className="after:content-['•'] after:mx-2 after:text-muted-foreground/50">
                  {article.author}
                </span>
              )}
              <span className="after:content-['•'] after:mx-2 after:text-muted-foreground/50">
                {article.source}
              </span>
              <span className="flex items-center">
                <Clock className="inline-block w-3.5 h-3.5 mr-1" />
                {article.readingTime} min read
              </span>
            </div>
            
            {article.imageUrl && (
              <div className="w-full aspect-video overflow-hidden rounded-lg mb-6">
                <img 
                  src={article.imageUrl} 
                  alt={article.title} 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
          
          {/* File viewer for special file types */}
          <FileViewer article={article} />
          
          {/* Regular content for web articles */}
          {(article.source === 'Web' || (article.source !== 'PDF' && article.source !== 'Book' && article.source !== 'Text' && article.source !== 'Note')) && (
            <div 
              ref={contentRef}
              className="reader-content prose prose-lg prose-slate max-w-none"
              onMouseUp={handleHighlight}
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          )}
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
