import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider } from '@/components/theme-provider';
import { SearchProvider } from '@/lib/contexts/SearchContext';
import AppRoutes from '@/routes';

const App = () => {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <SearchProvider>
        <Router>
          <AppRoutes />
        </Router>
      </SearchProvider>
    </ThemeProvider>
  );
};

export default App;
