import React from 'react';
import { Route, Routes } from 'react-router-dom';
import ImageProcessingTest from '../components/ImageProcessingTest';

// Import other pages as they are created
// import Dashboard from '../pages/Dashboard';
// import Settings from '../pages/Settings';

/**
 * Application Routes
 * Defines all the routes for the application
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<div className="p-8">Welcome to Readwise Spark</div>} />
      <Route path="/image-processing" element={<ImageProcessingTest />} />
      {/* Add other routes as they are implemented */}
      {/* <Route path="/dashboard" element={<Dashboard />} /> */}
      {/* <Route path="/settings" element={<Settings />} /> */}
      <Route path="*" element={<div className="p-8">Page not found</div>} />
    </Routes>
  );
} 