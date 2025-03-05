import React from 'react';
import { Route, Routes } from 'react-router-dom';
import ImageProcessingTest from '../components/ImageProcessingTest';

// Import other pages as they are created
// import Dashboard from '../pages/Dashboard';
// import Settings from '../pages/Settings';

/**
 * Main application routes component
 * Defines all the available routes in the application
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<div className="p-8">Welcome to Readwise Spark</div>} />
      <Route path="/image-processing-test" element={<ImageProcessingTest />} />
      {/* Add other routes as they are implemented */}
      {/* <Route path="/dashboard" element={<Dashboard />} /> */}
      {/* <Route path="/settings" element={<Settings />} /> */}
      <Route path="*" element={<div className="p-8">Page not found</div>} />
    </Routes>
  );
} 