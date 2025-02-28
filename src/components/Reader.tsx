
import React, { useState, useRef, useEffect } from 'react';
import { Article, Highlight } from '@/lib/types';
import { ArrowLeft, Bookmark, Share2, MoreHorizontal, Clock, X, Tag, Download, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import NoteDialog from './NoteDialog';
import TagDialog from './TagDialog';

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

const Reader = ({ article, onUpdateArticle }: ReaderProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [saved, setSaved] = useState(article.saved);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [highlights, setHighlights] = useState<Highlight[]>(article.highlights || []);
  const [activeHighlight, setActiveHighlight] = useState<Highlight | null>(null);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showTagDialog, setShowTagDialog] = useState(false);

  useEffect(() => {
    // Apply existing highlights to the content
    applyHighlights();
  }, [highlights]);

  const applyHighlights = () => {
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

    // Apply new highlights
    highlights.forEach((highlight) => {
      const content = contentRef.current?.innerHTML || '';
      const highlightedContent = content.replace(
        highlight.text,
        `<span class="highlight highlight-${highlight.color}" data-highlight-id="${highlight.id}">${highlight.text}</span>`
      );
      if (contentRef.current) {
        contentRef.current.innerHTML = highlightedContent;
      }
    });
  };

  const handleHighlight = () => {
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
            <button 
              className="p-2 rounded-full hover:bg-secondary transition-colors"
              onClick={exportHighlights}
              title="Export highlights"
            >
              <Download className="h-5 w-5" />
            </button>
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
          
          <div 
            ref={contentRef}
            className="reader-content prose prose-lg prose-slate max-w-none"
            onMouseUp={handleHighlight}
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </div>
      </div>

      <HighlightMenu
        position={menuPosition}
        onHighlight={createHighlight}
        onAddNote={handleAddNote}
        onAddTags={handleAddTags}
        onClose={() => setMenuPosition(null)}
      />

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
