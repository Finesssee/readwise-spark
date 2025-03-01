import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getArticles } from '@/utils/mockData';
import { Article } from '@/lib/types';
import { Link } from 'react-router-dom';

// Book card component
const BookCard = ({ book }: { book: Article }) => {
  return (
    <Link to={`/reader/${book.id}`} className="flex flex-col">
      <div className="relative aspect-[3/4] overflow-hidden rounded-md">
        {book.imageUrl ? (
          <img 
            src={book.imageUrl} 
            alt={book.title} 
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="w-full h-full bg-secondary/50 flex items-center justify-center">
            <span className="text-2xl font-bold text-muted-foreground">{book.title.charAt(0)}</span>
          </div>
        )}
      </div>
      <div className="mt-2">
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <span className="font-medium">{book.source}</span>
        </div>
        <h3 className="text-sm font-medium mt-1 line-clamp-1">{book.title}</h3>
        <div className="flex items-center mt-1">
          <div className="flex items-center">
            <span className="text-xs text-muted-foreground">{book.author || 'Unknown'}</span>
          </div>
        </div>
        <div className="flex items-center mt-1">
          <div className="flex items-center">
            <span className="text-xs text-muted-foreground">{book.readingTime} min read</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

const PaginationDots = ({ count, active }: { count: number, active: number }) => {
  return (
    <div className="flex items-center justify-center space-x-1 mt-4">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i}
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            i === active ? "bg-primary" : "bg-muted"
          )}
        />
      ))}
    </div>
  );
};

const Home = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [activeBookIndex, setActiveBookIndex] = useState(0);
  const [activePdfIndex, setActivePdfIndex] = useState(0);
  
  // Fetch articles when component mounts
  useEffect(() => {
    const fetchArticles = () => {
      const latestArticles = getArticles();
      setArticles(latestArticles);
    };
    
    fetchArticles();
    
    // Add event listener for focus to refresh articles when user returns to the page
    window.addEventListener('focus', fetchArticles);
    
    return () => {
      window.removeEventListener('focus', fetchArticles);
    };
  }, []);
  
  // Filter articles by source
  const books = articles.filter(article => 
    article.source === 'Book' || article.source === 'EPUB'
  );
  
  const pdfs = articles.filter(article => 
    article.source === 'PDF'
  );
  
  const webArticles = articles.filter(article => 
    article.source === 'Web'
  );
  
  const textFiles = articles.filter(article => 
    article.source === 'Text' || article.source === 'Note'
  );
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Home</h1>
        <Avatar className="h-8 w-8">
          <AvatarImage src="https://github.com/shadcn.png" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
      </div>
      
      {/* Books Section */}
      {books.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Books</h2>
            <div className="flex items-center space-x-1">
              <button 
                className="p-1 rounded-full hover:bg-secondary"
                onClick={() => setActiveBookIndex(Math.max(0, activeBookIndex - 1))}
                disabled={activeBookIndex === 0}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button 
                className="p-1 rounded-full hover:bg-secondary"
                onClick={() => setActiveBookIndex(Math.min(Math.max(0, books.length - 4), activeBookIndex + 1))}
                disabled={activeBookIndex >= Math.max(0, books.length - 4)}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {books.slice(activeBookIndex, activeBookIndex + 6).map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
          
          {books.length > 6 && (
            <PaginationDots 
              count={Math.ceil(books.length / 6)} 
              active={Math.floor(activeBookIndex / 6)} 
            />
          )}
        </div>
      )}
      
      {/* PDFs Section */}
      {pdfs.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">PDFs</h2>
            <div className="flex items-center space-x-1">
              <button 
                className="p-1 rounded-full hover:bg-secondary"
                onClick={() => setActivePdfIndex(Math.max(0, activePdfIndex - 1))}
                disabled={activePdfIndex === 0}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button 
                className="p-1 rounded-full hover:bg-secondary"
                onClick={() => setActivePdfIndex(Math.min(Math.max(0, pdfs.length - 4), activePdfIndex + 1))}
                disabled={activePdfIndex >= Math.max(0, pdfs.length - 4)}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {pdfs.slice(activePdfIndex, activePdfIndex + 6).map((pdf) => (
              <BookCard key={pdf.id} book={pdf} />
            ))}
          </div>
          
          {pdfs.length > 6 && (
            <PaginationDots 
              count={Math.ceil(pdfs.length / 6)} 
              active={Math.floor(activePdfIndex / 6)} 
            />
          )}
        </div>
      )}
      
      {/* Web Articles Section */}
      {webArticles.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Web Articles</h2>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {webArticles.slice(0, 6).map((article) => (
              <BookCard key={article.id} book={article} />
            ))}
          </div>
        </div>
      )}
      
      {/* Text Files Section */}
      {textFiles.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Text Files</h2>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {textFiles.slice(0, 6).map((file) => (
              <BookCard key={file.id} book={file} />
            ))}
          </div>
        </div>
      )}
      
      {articles.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No content in your library yet.</p>
          <p className="text-muted-foreground mt-2">Upload files or add articles to get started.</p>
        </div>
      )}
    </div>
  );
};

export default Home; 