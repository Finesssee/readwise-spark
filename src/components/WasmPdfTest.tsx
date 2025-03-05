import React, { useState, useRef } from 'react';
import { 
  loadPdfDocument, 
  getPdfMetadata, 
  renderPdfPageToCanvas, 
  createOrModifyPdf,
  isWasmSupported
} from '@/utils/wasmPdfUtils';

/**
 * Component for testing WebAssembly-based PDF processing
 */
const WasmPdfTest: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [metadata, setMetadata] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [wasmSupported, setWasmSupported] = useState<boolean>(isWasmSupported());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setFile(files[0]);
      setMetadata(null);
      setErrorMessage(null);
    }
  };
  
  // Process the selected PDF file
  const processPdf = async () => {
    if (!file || !wasmSupported) return;
    
    setLoading(true);
    setErrorMessage(null);
    
    try {
      // Read file as ArrayBuffer
      const buffer = await file.arrayBuffer();
      
      // Load the PDF document
      const pdfDoc = await loadPdfDocument(buffer);
      
      // Get and set metadata
      const pdfMetadata = await getPdfMetadata(pdfDoc, file.name);
      setMetadata(pdfMetadata);
      setTotalPages(pdfMetadata.pageCount || 0);
      
      // Set current page to first page
      setCurrentPage(0);
      
      // Render the first page
      if (canvasRef.current && pdfMetadata.pageCount > 0) {
        await renderPdfPageToCanvas(pdfDoc, 0, canvasRef.current);
      }
    } catch (error) {
      console.error('Error processing PDF:', error);
      setErrorMessage(`Error processing PDF: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Create a new PDF using WebAssembly
  const createNewPdf = async () => {
    setLoading(true);
    setErrorMessage(null);
    
    try {
      // Create a new PDF
      const pdfBuffer = await createOrModifyPdf();
      
      // Create a blob from the buffer
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      
      // Create a URL for the blob
      const url = URL.createObjectURL(blob);
      
      // Open the PDF in a new tab
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error creating PDF:', error);
      setErrorMessage(`Error creating PDF: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Navigate between pages
  const goToPage = async (page: number) => {
    if (!file || loading || page < 0 || page >= totalPages) return;
    
    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const pdfDoc = await loadPdfDocument(buffer);
      
      if (canvasRef.current) {
        await renderPdfPageToCanvas(pdfDoc, page, canvasRef.current);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error navigating to page:', error);
      setErrorMessage(`Error navigating to page: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-4">WebAssembly PDF Test</h2>
      
      {!wasmSupported ? (
        <div className="bg-red-100 p-4 rounded-md mb-4">
          <p className="text-red-700">WebAssembly is not supported in your browser.</p>
        </div>
      ) : (
        <div className="bg-green-100 p-4 rounded-md mb-4">
          <p className="text-green-700">WebAssembly is supported in your browser!</p>
        </div>
      )}
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select a PDF file
        </label>
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
      </div>
      
      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={processPdf}
          disabled={!file || loading || !wasmSupported}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 
                    disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Process PDF'}
        </button>
        
        <button
          onClick={createNewPdf}
          disabled={loading || !wasmSupported}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700
                    disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create New PDF'}
        </button>
      </div>
      
      {errorMessage && (
        <div className="bg-red-100 p-4 rounded-md mb-4">
          <p className="text-red-700">{errorMessage}</p>
        </div>
      )}
      
      {metadata && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">PDF Metadata</h3>
          <div className="bg-gray-50 p-4 rounded-md">
            <p><strong>Title:</strong> {metadata.title}</p>
            <p><strong>Author:</strong> {metadata.author}</p>
            <p><strong>Pages:</strong> {metadata.pageCount}</p>
            <p><strong>Creator:</strong> {metadata.creator}</p>
            <p><strong>Producer:</strong> {metadata.producer}</p>
            <p><strong>Creation Date:</strong> {metadata.creationDate}</p>
          </div>
        </div>
      )}
      
      {totalPages > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-center gap-4 mb-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 0 || loading}
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400"
            >
              Previous
            </button>
            <span>
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages - 1 || loading}
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400"
            >
              Next
            </button>
          </div>
        </div>
      )}
      
      <div className="border border-gray-300 rounded-md p-1 bg-gray-100">
        <canvas 
          ref={canvasRef} 
          className="max-w-full h-auto bg-white"
          width="800"
          height="600"
        />
      </div>
      
      <div className="mt-4 text-sm text-gray-500">
        <p>
          Powered by WebAssembly and @cantoo/pdf-lib for high-performance PDF processing.
        </p>
      </div>
    </div>
  );
};

export default WasmPdfTest; 