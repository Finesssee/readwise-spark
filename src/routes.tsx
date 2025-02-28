import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Index from '@/pages/Index';
import ReaderView from '@/pages/ReaderView';
import NotFound from '@/pages/NotFound';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/reader/:id" element={<ReaderView />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes; 