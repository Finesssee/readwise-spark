import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import Library from '@/pages/Library';
import ReaderView from '@/pages/ReaderView';
import NotFound from '@/pages/NotFound';
import PdfWasmTestPage from '@/pages/pdf-wasm-test';

const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/library" element={<Library />} />
        <Route path="/reader/:id" element={<ReaderView />} />
        <Route path="/pdf-wasm-test" element={<PdfWasmTestPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes; 