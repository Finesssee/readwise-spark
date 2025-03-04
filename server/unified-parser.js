/**
 * Unified Parser API
 * 
 * This service acts as an orchestrator for various document parsing backends:
 * - Apache Tika for general document formats
 * - PyMuPDF for PDF processing
 * - Unstructured for content extraction and organization
 * 
 * The service automatically selects the best parser based on file type and size.
 */

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { createReadStream } = require('fs');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');

// Import Tika service
const tikaService = require('./tika-service');

// Configuration
const config = {
  port: process.env.PORT || 3000,
  tikaPort: 9998,
  muPdfPort: 3001,
  unstructuredPort: 3002,
  uploadDir: path.join(__dirname, 'uploads'),
  pythonPath: process.env.PYTHON_PATH || 'python'  // Or 'python3' depending on your system
};

// Ensure upload directory exists
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(config.uploadDir));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }  // 100MB limit
});

// Add high-performance configuration
const performanceConfig = {
  // Processing configuration
  useParallelProcessing: true,
  maxParallelJobs: 8,
  chunkSizePages: 50,
  // Memory optimization
  useStreamProcessing: true,
  releaseMemoryInterval: 250, // MB
  // Cache configuration
  enableResultsCache: true,
  cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
  cacheSize: 500, // MB
  // Binary processing
  useBinaryModeForPDFs: true,
  optimizedImageExtraction: true,
  lowQualityPreviews: true
};

// Initialize simple in-memory cache for processed documents
const resultsCache = new Map();

// Add memory management for high performance
function optimizeMemoryUsage() {
  const memUsage = process.memoryUsage();
  if (memUsage.heapUsed > performanceConfig.releaseMemoryInterval * 1024 * 1024) {
    global.gc && global.gc(); // Force garbage collection if available
    console.log('Memory optimization performed');
  }
}

// Function to create chunks from a file for parallel processing
async function createProcessingChunks(filePath, chunkSize, fileType) {
  // For now, just return the full file as a single chunk
  // In a real implementation, this would split PDFs by page ranges
  return [{
    path: filePath,
    startPage: 1,
    endPage: null // Process to end
  }];
}

// Process chunks in parallel
async function processChunksInParallel(chunks, processor, options) {
  const results = await Promise.all(
    chunks.map(chunk => processor(chunk.path, options))
  );
  
  // Combine results (simplified)
  return results.reduce((combined, result) => {
    if (!combined) return result;
    if (result.data && result.data.content) {
      combined.data.content = (combined.data.content || '') + result.data.content;
    }
    return combined;
  });
}

// Cache helpers
function getCachedResult(fileHash) {
  const cached = resultsCache.get(fileHash);
  if (cached && Date.now() - cached.timestamp < performanceConfig.cacheTTL) {
    console.log('Cache hit for', fileHash);
    return cached.data;
  }
  return null;
}

function cacheResult(fileHash, data) {
  // Simple caching implementation
  resultsCache.set(fileHash, { 
    data, 
    timestamp: Date.now(),
    size: JSON.stringify(data).length / 1024 // Rough size in KB
  });
  
  // Prune cache if needed
  pruneCache();
}

function pruneCache() {
  // Remove oldest entries if cache is too large
  if (resultsCache.size > 100) { // Simple implementation
    const entries = [...resultsCache.entries()];
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest 20%
    const toRemove = Math.ceil(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      resultsCache.delete(entries[i][0]);
    }
  }
}

// Add file hashing function for cache keys
function hashFile(filePath) {
  try {
    const fileSize = fs.statSync(filePath).size;
    const lastModified = fs.statSync(filePath).mtime.getTime();
    return `${path.basename(filePath)}-${fileSize}-${lastModified}`;
  } catch (error) {
    console.error('Error creating file hash:', error);
    return null;
  }
}

// Start backend services
async function startBackendServices() {
  console.log('Starting backend parsing services...');
  
  // Start Tika
  try {
    await tikaService.initTika();
    console.log('Apache Tika server initialized');
  } catch (error) {
    console.error('Failed to start Tika server:', error);
  }
  
  // Start PyMuPDF service
  try {
    const pyMuPdfProcess = spawn(config.pythonPath, [path.join(__dirname, 'pymupdf_service.py')]);
    
    pyMuPdfProcess.stdout.on('data', (data) => {
      console.log(`PyMuPDF: ${data.toString().trim()}`);
    });
    
    pyMuPdfProcess.stderr.on('data', (data) => {
      console.error(`PyMuPDF Error: ${data.toString().trim()}`);
    });
    
    process.on('SIGINT', () => {
      pyMuPdfProcess.kill();
    });
  } catch (error) {
    console.error('Failed to start PyMuPDF service:', error);
  }
  
  // Start Unstructured service
  try {
    const unstructuredProcess = spawn(config.pythonPath, [path.join(__dirname, 'unstructured_service.py')]);
    
    unstructuredProcess.stdout.on('data', (data) => {
      console.log(`Unstructured: ${data.toString().trim()}`);
    });
    
    unstructuredProcess.stderr.on('data', (data) => {
      console.error(`Unstructured Error: ${data.toString().trim()}`);
    });
    
    process.on('SIGINT', () => {
      unstructuredProcess.kill();
    });
  } catch (error) {
    console.error('Failed to start Unstructured service:', error);
  }
}

// Helper function to detect file type from filename and mime type
function detectFileType(filename, mimeType) {
  const ext = path.extname(filename).toLowerCase().replace('.', '');
  
  // Map of common extensions to document types
  const extMap = {
    pdf: 'pdf',
    epub: 'epub',
    mobi: 'ebook',
    azw: 'ebook', 
    azw3: 'ebook',
    docx: 'word',
    doc: 'word',
    rtf: 'word',
    odt: 'word',
    txt: 'text',
    md: 'text',
    html: 'web',
    htm: 'web',
    xml: 'web',
    xls: 'excel',
    xlsx: 'excel',
    csv: 'excel',
    ppt: 'powerpoint',
    pptx: 'powerpoint'
  };
  
  return extMap[ext] || 'unknown';
}

// Routes
app.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Unified Document Parser',
    endpoints: {
      '/parse': 'Parse documents using the optimal backend',
      '/parse/tika': 'Parse using Apache Tika',
      '/parse/pdf': 'Parse PDFs using PyMuPDF',
      '/parse/extract': 'Extract content using Unstructured'
    }
  });
});

// Main parse endpoint - selects optimal parser
app.post('/parse', upload.single('file'), async (req, res) => {
  const startTime = Date.now();
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { file } = req;
    const fileType = detectFileType(file.originalname, file.mimetype);
    const fileSize = file.size;
    
    // Check for client optimization parameters
    const useParallelProcessing = req.body.strategy === 'chunked' || performanceConfig.useParallelProcessing;
    const priorityExtraction = req.body.priorityExtraction === 'true';
    const lowQualityPreview = req.body.lowQualityPreview === 'true' || performanceConfig.lowQualityPreviews;
    
    console.log(`Processing file: ${file.originalname} (${fileType}, ${fileSize} bytes) with ${useParallelProcessing ? 'parallel' : 'standard'} processing`);
    
    // Check cache first
    const fileHash = hashFile(file.path);
    const cachedResult = performanceConfig.enableResultsCache && fileHash ? getCachedResult(fileHash) : null;
    
    if (cachedResult) {
      console.log(`Cache hit for ${file.originalname}, returning result in ${Date.now() - startTime}ms`);
      return res.json({
        ...cachedResult,
        cached: true,
        processingTime: Date.now() - startTime
      });
    }
    
    // For very large files and appropriate types, use parallel processing with chunks
    if (useParallelProcessing && fileSize > 10 * 1024 * 1024 && ['pdf'].includes(fileType)) {
      // Create processing chunks
      const chunkSize = parseInt(req.body.chunkSize) || performanceConfig.chunkSizePages;
      const chunks = await createProcessingChunks(file.path, chunkSize, fileType);
      
      // If streaming is requested, handle differently
      if (performanceConfig.useStreamProcessing && chunks.length > 1) {
        // Start a background process and return a process ID
        const processId = uuidv4();
        
        // Respond immediately with the process ID
        res.json({
          status: 'processing',
          parser: 'pymupdf',
          data: {
            processId,
            metadata: { 
              title: path.basename(file.originalname),
              fileSize,
              estimatedPages: Math.ceil(fileSize / 50000) // Rough estimate
            }
          },
          message: 'Processing started in background'
        });
        
        // Process chunks in background
        processChunksInParallel(chunks, callPyMuPDF, {
          lowQuality: lowQualityPreview,
          priorityExtraction
        }).then(result => {
          // Store result with process ID for later retrieval
          cacheResult(processId, result);
          
          // Also cache by file hash
          if (fileHash) {
            cacheResult(fileHash, result);
          }
          
          // Optimize memory
          optimizeMemoryUsage();
        }).catch(console.error);
        
        return;
      }
    }
    
    // Choose parser based on file type, size, and requested options
    let parserResponse;
    
    if (fileType === 'pdf' && (fileSize > 3 * 1024 * 1024 || priorityExtraction)) {
      // PDFs with priority extraction or larger size go to PyMuPDF
      parserResponse = await callPyMuPDF(file.path, file.originalname, {
        lowQuality: lowQualityPreview,
        priorityExtraction
      });
    } else if (fileType === 'pdf' || fileType === 'word' || fileType === 'powerpoint' || fileType === 'excel') {
      // Common document formats go to Tika with content extraction
      parserResponse = await callTika(file.path, file.originalname, true);
    } else if (fileType === 'epub' || fileType === 'ebook') {
      // Let client handle these natively
      parserResponse = { 
        status: 'client_processing',
        message: 'This format should be processed by the client',
        filePath: file.path,
        fileName: file.originalname,
        fileType
      };
    } else {
      // Everything else goes to Unstructured
      parserResponse = await callUnstructured(file.path, file.originalname, {
        lowQuality: lowQualityPreview
      });
    }
    
    // Add file info and performance metrics to response
    parserResponse.fileName = file.originalname;
    parserResponse.fileSize = file.size;
    parserResponse.detectedType = fileType;
    parserResponse.processingTime = Date.now() - startTime;
    
    // Cache the result
    if (performanceConfig.enableResultsCache && fileHash) {
      cacheResult(fileHash, parserResponse);
    }
    
    // Optimize memory after processing
    optimizeMemoryUsage();
    
    res.json(parserResponse);
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error',
      status: 'error',
      processingTime: Date.now() - startTime
    });
  }
});

// Direct Tika endpoint
app.post('/parse/tika', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { file } = req;
    const result = await callTika(file.path, file.originalname, true);
    
    res.json(result);
  } catch (error) {
    console.error('Error processing with Tika:', error);
    res.status(500).json({ error: error.message });
  }
});

// Direct PyMuPDF endpoint
app.post('/parse/pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { file } = req;
    const result = await callPyMuPDF(file.path, file.originalname);
    
    res.json(result);
  } catch (error) {
    console.error('Error processing with PyMuPDF:', error);
    res.status(500).json({ error: error.message });
  }
});

// Direct Unstructured endpoint
app.post('/parse/extract', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { file } = req;
    const result = await callUnstructured(file.path, file.originalname);
    
    res.json(result);
  } catch (error) {
    console.error('Error processing with Unstructured:', error);
    res.status(500).json({ error: error.message });
  }
});

// Status endpoint for long-running processes
app.get('/status/:processId', async (req, res) => {
  const { processId } = req.params;
  const servicePath = req.query.service;
  
  try {
    let statusUrl;
    
    if (servicePath === 'pdf') {
      statusUrl = `http://localhost:${config.muPdfPort}/status/${processId}`;
    } else if (servicePath === 'extract') {
      statusUrl = `http://localhost:${config.unstructuredPort}/status/${processId}`;
    } else {
      return res.status(400).json({ error: 'Invalid service specified' });
    }
    
    const response = await axios.get(statusUrl);
    res.json(response.data);
  } catch (error) {
    console.error(`Error getting status for ${processId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Add status endpoint
app.get('/system-status', (req, res) => {
  res.json({
    status: 'ok',
    services: {
      tika: true,
      pymupdf: true,
      unstructured: true
    },
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Helper functions to call different backends
async function callTika(filePath, filename, extractContent = false) {
  try {
    const fileStream = createReadStream(filePath);
    const headers = {
      'Accept': 'application/json',
      'Content-Disposition': `attachment; filename=${encodeURIComponent(filename)}`
    };
    
    // Use /meta endpoint for metadata only, /tika for full content
    const endpoint = extractContent ? '/tika' : '/meta';
    
    const response = await axios.put(`http://localhost:${config.tikaPort}${endpoint}`, fileStream, {
      headers,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    return {
      status: 'success',
      parser: 'tika',
      data: response.data
    };
  } catch (error) {
    console.error('Error calling Tika:', error);
    throw new Error(`Tika processing failed: ${error.message}`);
  }
}

async function callPyMuPDF(filePath, filename) {
  try {
    const formData = new FormData();
    formData.append('file', createReadStream(filePath), {
      filename,
      knownLength: fs.statSync(filePath).size
    });
    
    const response = await axios.post(`http://localhost:${config.muPdfPort}/parse-pdf`, formData, {
      headers: {
        ...formData.getHeaders()
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    return {
      status: 'success',
      parser: 'pymupdf',
      data: response.data
    };
  } catch (error) {
    console.error('Error calling PyMuPDF:', error);
    throw new Error(`PyMuPDF processing failed: ${error.message}`);
  }
}

async function callUnstructured(filePath, filename) {
  try {
    const formData = new FormData();
    formData.append('file', createReadStream(filePath), {
      filename,
      knownLength: fs.statSync(filePath).size
    });
    
    const response = await axios.post(`http://localhost:${config.unstructuredPort}/extract`, formData, {
      headers: {
        ...formData.getHeaders()
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    return {
      status: 'success',
      parser: 'unstructured',
      data: response.data
    };
  } catch (error) {
    console.error('Error calling Unstructured:', error);
    throw new Error(`Unstructured processing failed: ${error.message}`);
  }
}

// Add health checks for backend services
async function checkServiceHealth() {
  const services = [
    { name: 'Tika', url: `http://localhost:${config.tikaPort}/tika` },
    { name: 'PyMuPDF', url: `http://localhost:${config.muPdfPort}/health` },
    { name: 'Unstructured', url: `http://localhost:${config.unstructuredPort}/health` }
  ];

  for (const service of services) {
    try {
      await axios.get(service.url, { timeout: 5000 });
      console.log(`${service.name} health check OK`);
    } catch (error) {
      console.error(`${service.name} health check FAILED: ${error.message}`);
      throw new Error(`${service.name} service unavailable`);
    }
  }
}

// Modify server startup sequence
async function startServer() {
  try {
    await startBackendServices();
    await checkServiceHealth(); // Add health check
    
    // Add system status endpoint for health checks
    app.get('/system-status', (req, res) => {
      res.json({
        status: 'ok',
        services: {
          tika: true,
          pymupdf: true,
          unstructured: true
        },
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
    });
    
    app.listen(config.port, () => {
      console.log(`Unified Parser API running on port ${config.port}`);
      console.log(`- Tika endpoint: http://localhost:${config.port}/parse/tika`);
      console.log(`- PyMuPDF endpoint: http://localhost:${config.port}/parse/pdf`);
      console.log(`- Unstructured endpoint: http://localhost:${config.port}/parse/extract`);
      console.log(`- Smart parsing: http://localhost:${config.port}/parse`);
    });
    
    // Add graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      // Perform cleanup
      process.exit(0);
    });
    
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      // Log error but keep running if possible
    });
    
  } catch (error) {
    console.error('Critical service failure:', error);
    process.exit(1);
  }
}

// If this file is run directly, start the server
if (require.main === module) {
  startServer().catch(console.error);
}

// Export for external use
module.exports = {
  app,
  startServer
}; 