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
  Settings
} from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { v4 as uuidv4 } from 'uuid';
import { Link } from 'react-router-dom';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PDFReaderProps {
  article: Article;
  onUpdateArticle?: (article: Article) => void;
}

interface TextSelectionPosition {
  x: number;
  y: number;
  text: string;
  rects: DOMRect[];
}

const PDFReader = ({ article, onUpdateArticle }: PDFReaderProps): React.ReactNode => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ReaderViewMode>('original');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [extractedText, setExtractedText] = useState<string>('');
  const [isTextExtracting, setIsTextExtracting] = useState(false);
  const [textSelection, setTextSelection] = useState<TextSelectionPosition | null>(null);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [currentHighlight, setCurrentHighlight] = useState<Highlight | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ pageIndex: number; matchIndex: number; str: string }[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef<unknown>(null);
  
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    documentRef.current = pdfjs;
  };
  
  const navigateToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const navigateToNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const decreaseZoom = () => {
    if (zoom > 50) {
      setZoom(zoom - 10);
    }
  };

  const increaseZoom = () => {
    if (zoom < 200) {
      setZoom(zoom + 10);
    }
  };
  
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      pdfContainerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };
  
  const toggleViewMode = async () => {
    if (viewMode === 'original') {
      // Switch to text view mode
      setViewMode('text');
      
      // Extract text if not already done
      if (!extractedText && !isTextExtracting) {
        await extractTextFromPDF();
      }
    } else {
      // Switch back to original view
      setViewMode('original');
    }
  };
  
  const extractTextFromPDF = async () => {
    if (!documentRef.current) return;
    
    try {
      setIsTextExtracting(true);
      
      // Use PDF.js to extract text from the PDF
      const loadingTask = pdfjs.getDocument(article.url);
      const pdf = await loadingTask.promise;
      
      let fullText = '';
      
      // Extract text from each page
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const textItems = textContent.items as { str: string }[];
        const pageText = textItems.map(item => item.str).join(' ');
        fullText += `<h2>Page ${i}</h2>\n${pageText}\n\n`;
      }
      
      setExtractedText(fullText);
      setIsTextExtracting(false);
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      setExtractedText('Failed to extract text from this PDF.');
      setIsTextExtracting(false);
    }
  };
  
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
      setTextSelection(null);
      return;
    }
    
    const range = selection.getRangeAt(0);
    const rects = Array.from(range.getClientRects());
    
    if (rects.length === 0) {
      setTextSelection(null);
      return;
    }
    
    // Calculate position for the highlight menu
    const firstRect = rects[0];
    const lastRect = rects[rects.length - 1];
    
    setTextSelection({
      x: (firstRect.left + lastRect.right) / 2,
      y: firstRect.top,
      text: selection.toString(),
      rects: Array.from(rects)
    });
    
    setShowHighlightMenu(true);
  };
  
  const handleHighlight = (color: string) => {
    if (!textSelection || !onUpdateArticle) return;
    
    const newHighlight: Highlight = {
      id: uuidv4(),
      articleId: article.id,
      text: textSelection.text,
      color: color as "yellow" | "blue" | "green" | "pink" | "purple" | "orange" | "red" | "teal",
      createdAt: new Date().toISOString(),
      pageNumber: viewMode === 'original' ? currentPage : undefined,
      position: viewMode === 'original' ? {
        boundingRect: textSelection.rects[0],
        rects: textSelection.rects
      } : undefined
    };
    
    const updatedArticle = {
      ...article,
      highlights: [...article.highlights, newHighlight]
    };
    
    onUpdateArticle(updatedArticle);
    setCurrentHighlight(newHighlight);
    setShowHighlightMenu(false);
    setShowNoteDialog(true);
  };
  
  const handleAddNote = (note: string) => {
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
  };
  
  const handleSearch = async () => {
    if (!searchQuery || !documentRef.current) return;
    
    setIsSearching(true);
    const searchResults: { pageIndex: number; matchIndex: number; str: string }[] = [];
    
    try {
      const loadingTask = pdfjs.getDocument(article.url);
      const pdf = await loadingTask.promise;
      
      // Search each page
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const textItems = textContent.items as { str: string }[];
        
        // Find matches on this page
        const pageText = textItems.map(item => item.str).join(' ');
        let matchIndex = 0;
        let lastIndex = -1;
        
        while ((lastIndex = pageText.indexOf(searchQuery, lastIndex + 1)) !== -1) {
          searchResults.push({
            pageIndex: i,
            matchIndex,
            str: searchQuery
          });
          matchIndex++;
        }
      }
      
      setSearchResults(searchResults);
      
      if (searchResults.length > 0) {
        setCurrentSearchIndex(0);
        setCurrentPage(searchResults[0].pageIndex);
      }
    } catch (error) {
      console.error('Error searching PDF:', error);
    } finally {
      setIsSearching(false);
    }
  };
  
  const navigateSearchResults = (direction: 'next' | 'prev') => {
    if (searchResults.length === 0) return;
    
    let newIndex = currentSearchIndex;
    
    if (direction === 'next') {
      newIndex = (currentSearchIndex + 1) % searchResults.length;
    } else {
      newIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    }
    
    setCurrentSearchIndex(newIndex);
    setCurrentPage(searchResults[newIndex].pageIndex);
  };
  
  // Create thumbnail array based on total pages
  const thumbnails = Array.from({ length: Math.min(8, numPages) }, (_, i) => i + 1);
  
  // Handle text selection in text view mode
  useEffect(() => {
    const handleMouseUp = () => {
      if (viewMode === 'text') {
        handleTextSelection();
      }
    };
    
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [viewMode]);
  
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
  
  return (
    <div className="fixed inset-0 bg-gray-900 text-white flex flex-col h-screen pt-16">
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
        {/* Left Sidebar - Thumbnails */}
        <div className="w-[120px] border-r border-gray-800 flex flex-col bg-gray-900">
          {/* Book Cover */}
          <div className="p-3 border-b border-gray-800">
            <div className="w-full aspect-square bg-green-500 rounded overflow-hidden flex items-center justify-center relative">
              {article.imageUrl ? (
                <img 
                  src={article.imageUrl} 
                  alt={article.title} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-b from-green-400/30 to-green-600"></div>
              )}
              <div className="z-10 p-2 text-center">
                <div className="text-sm font-medium text-white leading-tight">
                  {article.title.length > 20 ? `${article.title.substring(0, 20)}...` : article.title}
                </div>
              </div>
            </div>
          </div>
          
          {/* Page Thumbnails */}
          <div className="flex-1 overflow-auto p-2 space-y-2">
            {thumbnails.map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-full aspect-square bg-gray-800 rounded-md flex items-center justify-center ${
                  currentPage === pageNum ? 'ring-2 ring-pink-500' : ''
                }`}
              >
                <span className="text-xs">{pageNum}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col relative">
          {/* PDF Toolbar */}
          <div className="h-12 border-b border-gray-800 flex items-center justify-between px-4 bg-gray-900">
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <button 
                  className="p-1.5 rounded hover:bg-gray-800"
                  onClick={decreaseZoom}
                  title="Zoom out"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-sm">{zoom}%</span>
                <button 
                  className="p-1.5 rounded hover:bg-gray-800"
                  onClick={increaseZoom}
                  title="Zoom in"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              
              {/* View Mode Toggle */}
              <button 
                className="p-1.5 rounded hover:bg-gray-800"
                onClick={toggleViewMode}
                title={viewMode === 'original' ? 'Switch to text view' : 'Switch to original view'}
              >
                {viewMode === 'original' ? (
                  <AlignLeft className="h-4 w-4" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
              </button>
            </div>
            
            <div className="text-sm">
              {currentPage} / {numPages || 1}
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
              
              <button className="p-1.5 rounded hover:bg-gray-800">
                <RotateCw className="h-4 w-4" />
              </button>
              <button className="p-1.5 rounded hover:bg-gray-800">
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {/* PDF Content */}
          <div 
            ref={pdfContainerRef}
            className="flex-1 overflow-auto bg-gray-900 flex justify-center"
          >
            {isLoading && (
              <div className="flex items-center justify-center h-full w-full absolute z-10 bg-gray-900/80">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
              </div>
            )}
            
            {viewMode === 'original' ? (
              <Document
                file={article.url}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={null}
                error={
                  <div className="flex items-center justify-center h-full w-full text-center p-4">
                    <div>
                      <p className="text-red-500 mb-2">Failed to load PDF</p>
                      <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                        Open PDF in new tab
                      </a>
                    </div>
                  </div>
                }
                className="flex items-center justify-center py-4"
              >
                <Page
                  pageNumber={currentPage}
                  width={pdfContainerRef.current?.clientWidth * (zoom / 100) || 600}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="bg-white shadow-xl"
                  onMouseUp={handleTextSelection}
                />
              </Document>
            ) : (
              <div className="w-full h-full overflow-auto p-8 bg-white text-black">
                {isTextExtracting ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
                    <p className="ml-2">Extracting text...</p>
                  </div>
                ) : (
                  <div 
                    className="max-w-3xl mx-auto prose prose-lg"
                    dangerouslySetInnerHTML={{ __html: extractedText }}
                  />
                )}
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
              className="flex items-center space-x-1 text-sm"
              onClick={navigateToPrevPage}
              disabled={currentPage <= 1}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>
            
            <div className="text-sm">
              {currentPage} / {numPages || 1}
            </div>
            
            <button 
              className="flex items-center space-x-1 text-sm"
              onClick={navigateToNextPage}
              disabled={currentPage >= numPages}
            >
              <span>Next</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Right Sidebar - Info Panel */}
        <div className="w-[300px] border-l border-gray-800 flex flex-col bg-gray-900">
          <div className="h-12 border-b border-gray-800 flex items-center px-4">
            <div className="flex items-center space-x-2">
              <Info className="h-5 w-5" />
              <span className="font-medium">Info</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto">
            <div className="p-4 border-b border-gray-800">
              <h2 className="text-lg font-medium">{article.title}</h2>
              <div className="text-sm text-gray-400 mt-1">{article.source}</div>
            </div>
            
            <div className="p-4 border-b border-gray-800 flex items-center">
              <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                <span className="text-xs">{article.author?.substring(0, 2) || 'AU'}</span>
              </div>
              <div className="ml-3">
                <div className="font-medium">{article.author || 'Unknown Author'}</div>
                <div className="text-xs text-gray-400">Author</div>
              </div>
            </div>
            
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-4">METADATA</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm">Type</span>
                  <span className="text-sm">{article.source}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Size</span>
                  <span className="text-sm">{"< 1 KB"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Added</span>
                  <span className="text-sm">{new Date(article.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Reading Time</span>
                  <span className="text-sm">{article.readingTime || 'Unknown'} min</span>
                </div>
                {article.pageCount && (
                  <div className="flex justify-between">
                    <span className="text-sm">Pages</span>
                    <span className="text-sm">{article.pageCount}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Highlights Section */}
            {article.highlights.length > 0 && (
              <div className="p-4 border-t border-gray-800">
                <h3 className="text-sm font-medium text-gray-400 mb-4">HIGHLIGHTS</h3>
                <div className="space-y-4">
                  {article.highlights.map((highlight) => (
                    <div 
                      key={highlight.id} 
                      className="p-3 rounded-md bg-gray-800"
                      onClick={() => {
                        if (highlight.pageNumber) {
                          setCurrentPage(highlight.pageNumber);
                          setViewMode('original');
                        }
                      }}
                    >
                      <div className={`border-l-4 border-highlight-${highlight.color} pl-2 mb-2`}>
                        <p className="text-sm">{highlight.text}</p>
                      </div>
                      {highlight.note && (
                        <p className="text-xs text-gray-400 mt-2">{highlight.note}</p>
                      )}
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                        <span>
                          {highlight.pageNumber ? `Page ${highlight.pageNumber}` : 'Text view'}
                        </span>
                        <span>{new Date(highlight.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
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

export default PDFReader; 