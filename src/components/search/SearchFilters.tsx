import React, { useCallback } from 'react';
import { useSearch } from '@/lib/contexts/SearchContext';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';

const SearchFilters: React.FC = () => {
  const { state, dispatch } = useSearch();
  const { filters } = state;

  const handleDateRangeChange = useCallback((date: Date | undefined) => {
    if (!date) return;

    const currentRange = filters.dateRange || { from: new Date(), to: new Date() };
    if (!filters.dateRange?.from || date < currentRange.from) {
      dispatch({
        type: 'SET_FILTERS',
        payload: { dateRange: { ...currentRange, from: date } },
      });
    } else {
      dispatch({
        type: 'SET_FILTERS',
        payload: { dateRange: { ...currentRange, to: date } },
      });
    }
  }, [dispatch, filters.dateRange]);

  const handleSourceToggle = useCallback((source: string) => {
    const currentSources = filters.source || [];
    const newSources = currentSources.includes(source)
      ? currentSources.filter(s => s !== source)
      : [...currentSources, source];
    
    dispatch({
      type: 'SET_FILTERS',
      payload: { source: newSources },
    });
  }, [dispatch, filters.source]);

  const handleTagToggle = useCallback((tag: string) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    
    dispatch({
      type: 'SET_FILTERS',
      payload: { tags: newTags },
    });
  }, [dispatch, filters.tags]);

  const handleReset = useCallback(() => {
    dispatch({
      type: 'SET_FILTERS',
      payload: { 
        readStatus: 'all',
        dateRange: undefined,
        source: undefined,
        tags: undefined,
        hasHighlights: undefined,
        hasNotes: undefined
      },
    });
  }, [dispatch]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium mb-2">Date Range</h3>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="default"
              className="w-full justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.dateRange ? (
                <span>
                  {format(filters.dateRange.from, 'LLL dd, y')} -{' '}
                  {format(filters.dateRange.to, 'LLL dd, y')}
                </span>
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={filters.dateRange as DateRange}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  dispatch({
                    type: 'SET_FILTERS',
                    payload: {
                      dateRange: { from: range.from, to: range.to },
                    },
                  });
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <h3 className="font-medium mb-2">Read Status</h3>
        <div className="space-y-2">
          {['all', 'read', 'unread'].map((status) => (
            <button
              key={status}
              className={`w-full px-2 py-1 text-left rounded-md ${
                filters.readStatus === status
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-secondary'
              }`}
              onClick={() =>
                dispatch({
                  type: 'SET_FILTERS',
                  payload: { readStatus: status as 'all' | 'read' | 'unread' },
                })
              }
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="hasHighlights">Has Highlights</Label>
          <Switch
            id="hasHighlights"
            checked={filters.hasHighlights}
            onCheckedChange={(checked) =>
              dispatch({
                type: 'SET_FILTERS',
                payload: { hasHighlights: checked },
              })
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="hasNotes">Has Notes</Label>
          <Switch
            id="hasNotes"
            checked={filters.hasNotes}
            onCheckedChange={(checked) =>
              dispatch({
                type: 'SET_FILTERS',
                payload: { hasNotes: checked },
              })
            }
          />
        </div>
      </div>

      <div>
        <h3 className="font-medium mb-2">Sources</h3>
        <div className="flex flex-wrap gap-2">
          {/* This would come from your SearchService */}
          {['Web', 'PDF', 'Kindle', 'Twitter'].map((source) => (
            <Badge
              key={source}
              variant={filters.source?.includes(source) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => handleSourceToggle(source)}
            >
              {source}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-medium mb-2">Tags</h3>
        <div className="flex flex-wrap gap-2">
          {/* This would come from your SearchService */}
          {['research', 'toread', 'important', 'reference'].map((tag) => (
            <Badge
              key={tag}
              variant={filters.tags?.includes(tag) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => handleTagToggle(tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Reset Filters */}
      <Button
        variant="outline"
        size="default"
        className="w-full"
        onClick={handleReset}
      >
        Reset Filters
      </Button>
    </div>
  );
};

export default SearchFilters; 