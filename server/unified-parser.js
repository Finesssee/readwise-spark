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
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { file } = req;
    const fileType = detectFileType(file.originalname, file.mimetype);
    const fileSize = file.size;
    
    console.log(`Processing file: ${file.originalname} (${fileType}, ${fileSize} bytes)`);
    
    // Choose parser based on file type and size
    let parserResponse;
    
    if (fileType === 'pdf' && fileSize > 5 * 1024 * 1024) {
      // Large PDFs go to PyMuPDF
      parserResponse = await callPyMuPDF(file.path, file.originalname);
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
      parserResponse = await callUnstructured(file.path, file.originalname);
    }
    
    // Add file info to response
    parserResponse.fileName = file.originalname;
    parserResponse.fileSize = file.size;
    parserResponse.detectedType = fileType;
    
    res.json(parserResponse);
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error',
      status: 'error'
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

// Start the server
async function startServer() {
  try {
    // First start backend services
    await startBackendServices();
    
    // Then start the API server
    app.listen(config.port, () => {
      console.log(`Unified Parser API running on port ${config.port}`);
      console.log(`- Tika endpoint: http://localhost:${config.port}/parse/tika`);
      console.log(`- PyMuPDF endpoint: http://localhost:${config.port}/parse/pdf`);
      console.log(`- Unstructured endpoint: http://localhost:${config.port}/parse/extract`);
      console.log(`- Smart parsing: http://localhost:${config.port}/parse`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
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