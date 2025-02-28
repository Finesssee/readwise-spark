
import React, { useState, useRef } from 'react';
import { Article } from '@/lib/types';
import { ArrowLeft, Bookmark, Share2, MoreHorizontal, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ReaderProps {
  article: Article;
}

const Reader = ({ article }: ReaderProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [saved, setSaved] = useState(article.saved);

  const handleHighlight = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    
    console.log('Selected text:', selection.toString());
    // In a real implementation, this would save the highlight
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
    </div>
  );
};

export default Reader;
