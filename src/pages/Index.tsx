import React, { useState } from 'react';
import Header from '@/components/Header';
import ArticleCard from '@/components/ArticleCard';
import { getArticles } from '@/utils/mockData';
import { ArticleView } from '@/lib/types';
import { LayoutGrid, List, Filter, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const Index = () => {
  const [view, setView] = useState<ArticleView>('grid');
  const articles = getArticles();
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1">
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
        </div>
      </main>
    </div>
  );
};

export default Index;
