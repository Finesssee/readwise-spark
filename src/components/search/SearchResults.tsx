import React from 'react';
import { useSearch } from '@/lib/contexts/search/hooks';
import { CommandGroup, CommandItem } from '@/components/ui/command';
import { useNavigate } from 'react-router-dom';
import { Clock, BookOpen, Tag } from 'lucide-react';

const SearchResults: React.FC = () => {
  const { state } = useSearch();
  const navigate = useNavigate();
  const { results, isLoading } = state;

  if (isLoading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full" />
        <p className="mt-2">Searching...</p>
      </div>
    );
  }

  if (!results.length) {
    return null;
  }

  return (
    <CommandGroup>
      {results.map((article) => (
        <CommandItem
          key={article.id}
          onSelect={() => navigate(`/reader/${article.id}`)}
          className="px-4 py-3"
        >
          <div className="flex flex-col gap-1">
            <div className="font-medium">{article.title}</div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {article.readingTime} min read
              </span>
              
              {article.readAt && (
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  Read
                </span>
              )}
              
              {article.source && (
                <span>{article.source}</span>
              )}
            </div>

            {/* Show matching highlights if any */}
            {article.highlights?.length > 0 && (
              <div className="mt-2 text-sm">
                <div className="font-medium mb-1">Matching Highlights:</div>
                {article.highlights.slice(0, 2).map((highlight) => (
                  <div
                    key={highlight.id}
                    className={`p-2 rounded-md mt-1 bg-highlight-${highlight.color} bg-opacity-10`}
                  >
                    {highlight.text}
                    {highlight.note && (
                      <div className="mt-1 text-muted-foreground">
                        Note: {highlight.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Show tags if any */}
            {article.tags?.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                <div className="flex flex-wrap gap-1">
                  {article.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded-md text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CommandItem>
      ))}
    </CommandGroup>
  );
};

export default SearchResults; 