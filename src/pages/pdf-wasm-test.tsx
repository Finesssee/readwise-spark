import React from 'react';
import WasmPdfTest from '@/components/WasmPdfTest';

/**
 * Page for testing WebAssembly-based PDF processing
 */
const PdfWasmTestPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">WebAssembly PDF Processing</h1>
      <p className="mb-6 text-gray-700">
        This page demonstrates high-performance PDF processing using WebAssembly 
        and the @cantoo/pdf-lib library. Upload a PDF to test the functionality.
      </p>
      
      <WasmPdfTest />
      
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">About WebAssembly PDF Processing</h2>
        <p className="text-gray-700">
          WebAssembly (Wasm) allows for near-native performance in the browser. By using 
          @cantoo/pdf-lib with WebAssembly, we can process PDFs much faster than with 
          traditional JavaScript libraries.
        </p>
        <p className="mt-2 text-gray-700">
          This implementation provides:
        </p>
        <ul className="list-disc pl-5 mt-2 text-gray-700">
          <li>Fast PDF loading and parsing</li>
          <li>Efficient metadata extraction</li>
          <li>High-performance page rendering</li>
          <li>PDF creation and modification capabilities</li>
        </ul>
      </div>
    </div>
  );
};

export default PdfWasmTestPage; 