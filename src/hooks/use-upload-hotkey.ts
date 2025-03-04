import { useEffect } from 'react';

export function useUploadHotkey(callback: () => void): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+U or Command+U keyboard shortcut
      if ((event.ctrlKey || event.metaKey) && event.key === 'u') {
        event.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [callback]);
} 