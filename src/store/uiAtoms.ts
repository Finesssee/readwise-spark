import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { focusAtom } from 'jotai-optics';
import { measurePerformance } from '../utils/performanceMonitoring';

// Reader UI state
export const readingModeAtom = atomWithStorage<'paginated' | 'continuous'>('reading-mode', 'continuous');
export const sidebarOpenAtom = atom<boolean>(false);
export const tableOfContentsOpenAtom = atom<boolean>(false);
export const annotationsPanelOpenAtom = atom<boolean>(false);
export const searchOpenAtom = atom<boolean>(false);
export const currentPageAtom = atom<number>(1);
export const totalPagesAtom = atom<number>(0);

// Annotation mode
export const isAnnotatingAtom = atom<boolean>(false);
export const annotationColorAtom = atomWithStorage<string>('annotation-color', '#FFEB3B'); // Default yellow

// Selection state
export const textSelectionAtom = atom<{
  text: string;
  position?: { x: number; y: number };
  range?: Range;
  cfi?: string; // For EPUB
  pageNumber?: number; // For PDF
} | null>(null);

// Search state
interface SearchResultItem {
  id: string;
  text: string;
  location: {
    pageNumber?: number;
    cfi?: string;
    percentage?: number;
  };
  preview: string;
}

export const searchQueryAtom = atom<string>('');
export const searchResultsAtom = atom<SearchResultItem[]>([]);
export const selectedSearchResultAtom = atom<string | null>(null);
export const isSearchingAtom = atom<boolean>(false);

// Zoom state
export const zoomLevelAtom = atomWithStorage<number>('zoom-level', 1.0);

// UI theme state
export const colorSchemeAtom = atomWithStorage<'light' | 'dark' | 'sepia'>('color-scheme', 'light');

// Font settings
export const fontSettingsAtom = atomWithStorage('font-settings', {
  fontSize: 16,
  fontFamily: 'system-ui, sans-serif',
  lineHeight: 1.5,
});

// Focus atoms for specific font settings
export const fontSizeAtom = focusAtom(fontSettingsAtom, (optic) => optic.prop('fontSize'));
export const fontFamilyAtom = focusAtom(fontSettingsAtom, (optic) => optic.prop('fontFamily'));
export const lineHeightAtom = focusAtom(fontSettingsAtom, (optic) => optic.prop('lineHeight'));

// Layout settings
export const layoutSettingsAtom = atomWithStorage('layout-settings', {
  marginSize: 'medium',
  textAlign: 'left',
  paragraphSpacing: 'medium',
});

// Toolbar visibility
export const toolbarVisibleAtom = atom<boolean>(true);
export const autoHideToolbarAtom = atomWithStorage<boolean>('auto-hide-toolbar', true);

// Performance monitoring wrapper for Jotai
export const withPerformanceTracking = <T,>(baseAtom: any, name: string) => {
  const trackedAtom = atom(
    (get) => get(baseAtom),
    (get, set, update: T) => {
      const startTime = performance.now();
      set(baseAtom, update);
      const endTime = performance.now();
      console.log(`[Performance] Atom update "${name}": ${(endTime - startTime).toFixed(2)}ms`);
    }
  );
  return trackedAtom;
};

// Tracked atoms for performance-critical operations
export const trackedSearchQueryAtom = withPerformanceTracking(searchQueryAtom, 'searchQuery');
export const trackedZoomLevelAtom = withPerformanceTracking(zoomLevelAtom, 'zoomLevel');

// Document view mode
export const documentViewModeAtom = atomWithStorage<'single' | 'double' | 'scroll'>('document-view-mode', 'single');

// Fullscreen state
export const isFullscreenAtom = atom<boolean>(false);

// Custom reader metrics
export const readerMetricsAtom = atom<{
  timeSpentReading: number;
  pagesRead: number;
  averageReadingSpeed: number;
  lastReadTimestamp: number | null;
}>({
  timeSpentReading: 0,
  pagesRead: 0,
  averageReadingSpeed: 0,
  lastReadTimestamp: null,
});

// Utility functions
export const updateReadingMetrics = (get: any, set: any) => {
  const currentMetrics = get(readerMetricsAtom);
  const now = Date.now();
  
  // If we have a previous timestamp, calculate time spent reading
  if (currentMetrics.lastReadTimestamp) {
    const timeElapsed = (now - currentMetrics.lastReadTimestamp) / 1000; // in seconds
    
    // Only count if less than 5 minutes (300 seconds) to avoid counting idle time
    if (timeElapsed < 300) {
      set(readerMetricsAtom, {
        ...currentMetrics,
        timeSpentReading: currentMetrics.timeSpentReading + timeElapsed,
        lastReadTimestamp: now,
      });
    } else {
      // Just update the timestamp if it's been too long
      set(readerMetricsAtom, {
        ...currentMetrics,
        lastReadTimestamp: now,
      });
    }
  } else {
    // First read, just set the timestamp
    set(readerMetricsAtom, {
      ...currentMetrics,
      lastReadTimestamp: now,
    });
  }
}; 