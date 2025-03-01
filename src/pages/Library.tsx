import React, { useState, useEffect } from 'react';
import ArticleCard from '@/components/ArticleCard';
import { getArticles } from '@/utils/mockData';
import { ArticleView, Article } from '@/lib/types';
import { LayoutGrid, List, Filter, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const Library = () => {
  const [view, setView] = useState<ArticleView>('grid');
  const [articles, setArticles] = useState<Article[]>([]);
  
  // Fetch articles when component mounts or when user navigates to this page
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
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold tracking-tight">My Library</h1>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-secondary rounded-md p-1">
            <button 
              className={cn(
                "p-1.5 rounded", 
                view === 'grid' ? "bg-background shadow-sm" : "hover:bg-secondary/80"
              )}
              onClick={() => setView('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button 
              className={cn(
                "p-1.5 rounded", 
                view === 'list' ? "bg-background shadow-sm" : "hover:bg-secondary/80"
              )}
              onClick={() => setView('list')}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          
          <button className="p-2 rounded-md border bg-background hover:bg-secondary/20 transition-colors">
            <Filter className="h-4 w-4" />
          </button>
          <button className="p-2 rounded-md border bg-background hover:bg-secondary/20 transition-colors">
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {articles.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No articles in your library yet.</p>
          <p className="text-muted-foreground mt-2">Upload files or add articles to get started.</p>
        </div>
      ) : (
        <div className={cn(
          "grid gap-4",
          view === 'grid' 
            ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" 
            : "grid-cols-1"
        )}>
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} view={view} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Library; 