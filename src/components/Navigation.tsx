import React from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * Main navigation component for the application
 * Provides links to various application routes
 */
export default function Navigation() {
  const location = useLocation();
  
  // Define navigation items
  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/image-processing-test', label: 'Image Processing Test' },
    // Add more navigation items as routes are implemented
  ];
  
  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
        <div className="flex items-center mb-4 md:mb-0">
          <span className="text-xl font-bold">Readwise Spark</span>
        </div>
        
        <div className="flex flex-wrap justify-center gap-4">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-3 py-2 rounded hover:bg-gray-700 transition ${
                location.pathname === item.path ? 'bg-gray-700 font-medium' : ''
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
} 