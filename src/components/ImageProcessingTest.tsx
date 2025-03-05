import { lazy, Suspense } from 'react';

// Lazy load the main image processing component
const ImageProcessing = lazy(() => import('./ImageProcessing'));

export default function ImageProcessingTest() {
  return (
    <Suspense fallback={<div className="p-8">Loading image processing tools...</div>}>
      <ImageProcessing />
    </Suspense>
  );
} 