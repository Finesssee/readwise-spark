import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from '../routes/AppRoutes';
import Navigation from './Navigation';

/**
 * Main application content component
 * Wraps the router and provides the main application layout
 */
export default function AppContent() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-grow">
          <AppRoutes />
        </main>
        <footer className="bg-gray-100 p-4 text-center text-gray-600 text-sm">
          <p>© {new Date().getFullYear()} Readwise Spark - Image Processing Demo</p>
        </footer>
      </div>
    </BrowserRouter>
  );
} 