import React, { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Command, CommandInput, CommandList, CommandEmpty } from '@/components/ui/command';
import { useSearch } from '@/lib/contexts/SearchContext';
import SearchFilters from '@/components/search/SearchFilters';
import SearchResults from '@/components/search/SearchResults';
import { X } from 'lucide-react';

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SearchDialog: React.FC<SearchDialogProps> = ({ open, onOpenChange }) => {
  const { state, search } = useSearch();
  const [debouncedQuery, setDebouncedQuery] = useState(state.query);

  const performSearch = useCallback(() => {
    search(debouncedQuery, state.filters);
  }, [search, debouncedQuery, state.filters]);

  // Effect for initial search when dialog opens
  useEffect(() => {
    if (open) {
      performSearch();
    }
  }, [open, performSearch]);

  // Effect for debounced search
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(performSearch, 300);
    return () => clearTimeout(timer);
  }, [open, performSearch]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0">
        <DialogTitle className="sr-only">Search Articles</DialogTitle>
        <DialogDescription className="sr-only">
          Search through your articles, highlights, and notes using keywords and filters.
        </DialogDescription>
        
        <Command className="rounded-lg border shadow-md">
          <div className="flex items-center border-b px-3">
            <CommandInput
              placeholder="Search articles, highlights, and notes..."
              value={debouncedQuery}
              onValueChange={setDebouncedQuery}
              className="flex-1 min-h-12"
            />
            <button
              onClick={() => onOpenChange(false)}
              className="ml-2 p-2 hover:bg-secondary rounded-md"
              aria-label="Close search"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex">
            {/* Filters sidebar */}
            <div className="w-64 border-r p-4 space-y-4">
              <SearchFilters />
            </div>

            {/* Results area */}
            <div className="flex-1">
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <SearchResults />
              </CommandList>
            </div>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
};

export default SearchDialog; 