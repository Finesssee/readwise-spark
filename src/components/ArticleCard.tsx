import React from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Article } from '@/lib/types';
import { CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ArticleCardProps {
  article: Article;
  view?: 'grid' | 'list';
}

const ArticleCard = ({ article, view = 'grid' }: ArticleCardProps) => {
  const isGrid = view === 'grid';
  
  return (
    <Link to={`/reader/${article.id}`} className={cn(
      "group relative flex overflow-hidden rounded-lg border bg-card transition-all duration-300",
      "hover:shadow-md",
      isGrid ? "flex-col" : "items-center space-x-4"
    )}>
      {article.imageUrl && (
        <div className={cn(
          "overflow-hidden bg-muted/20", 
          isGrid ? "aspect-[4/3] w-full" : "aspect-square h-full w-24 sm:w-32 md:w-40"
        )}>
          <img 
            src={article.imageUrl} 
            alt={article.title} 
            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}
      
      <div className={cn(
        "flex flex-col",
        isGrid ? "flex-1 p-4" : "flex-1 p-4 max-w-3xl"
      )}>
        <div className="flex justify-between items-start gap-2 mb-2">
          <div>
            <div className="text-xs text-muted-foreground">
              {article.source} • {article.date}
            </div>
            <h3 className={cn(
              "font-medium leading-tight tracking-tight text-balance",
              isGrid ? "text-base sm:text-lg" : "text-lg sm:text-xl mb-1.5"
            )}>
              {article.title}
            </h3>
          </div>
          <button className="text-muted-foreground/70 hover:text-primary transition-colors p-1 mt-0.5 rounded-full">
            <Bookmark className={cn("w-4 h-4", article.saved ? "fill-current" : "")} />
          </button>
        </div>
        
        {!isGrid && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {article.excerpt}
          </p>
        )}
        
        <div className="flex items-center mt-auto space-x-3 text-xs text-muted-foreground">
          <div className="flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            <span>{article.readingTime} min read</span>
          </div>
          
          {article.highlights.length > 0 && (
            <div className="flex items-center">
              <span className="bg-highlight-yellow w-3 h-3 rounded-sm mr-1"></span>
              <span>{article.highlights.length} highlight{article.highlights.length !== 1 ? 's' : ''}</span>
            </div>
          )}
          
          {article.tags && article.tags.length > 0 && (
            <div className="hidden sm:block">
              {article.tags.map((tag, index) => (
                <span key={index} className="after:content-[','] last:after:content-[''] after:mr-1">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <CardFooter className="pt-1">
          <div className="flex justify-between items-center w-full text-xs text-muted-foreground">
            <span>{article.date}</span>
            {Array.isArray(article.tags) && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 justify-end">
                {article.tags.slice(0, 2).map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs py-0">
                    {tag}
                  </Badge>
                ))}
                {article.tags.length > 2 && (
                  <Badge variant="secondary" className="text-xs py-0">
                    +{article.tags.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardFooter>
      </div>
    </Link>
  );
};

export default ArticleCard;
