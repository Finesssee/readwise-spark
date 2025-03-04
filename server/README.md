# Document Parser Service

This service provides high-performance document parsing capabilities by integrating several powerful libraries:

- **Apache Tika**: For general document formats and metadata extraction
- **PyMuPDF**: For fast PDF processing
- **Unstructured**: For content extraction and organization

## Installation

### Prerequisites

- Node.js 14+ (for the API server)
- Python 3.8+ (for PyMuPDF and Unstructured)
- Java 11+ (for Apache Tika)

### Node.js Dependencies

```bash
npm install
```

### Python Dependencies

```bash
# Create a virtual environment (recommended)
python -m venv parser-env
source parser-env/bin/activate  # On Windows: parser-env\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Running the Service

### Start Everything with a Single Command

```bash
npm start
```

This will:
1. Download Apache Tika (if not already downloaded)
2. Start the Tika server
3. Start the PyMuPDF service
4. Start the Unstructured service
5. Start the unified API server

### Individual Services

You can also start services individually:

```bash
# Start only Tika
npm run tika

# Start only PyMuPDF
python pymupdf_service.py

# Start only Unstructured
python unstructured_service.py
```

## API Endpoints

### Main Endpoint

- **POST /parse**: Automatically selects the best parser based on file type and size

### Service-Specific Endpoints

- **POST /parse/tika**: Parse using Apache Tika
- **POST /parse/pdf**: Parse PDFs using PyMuPDF
- **POST /parse/extract**: Extract content using Unstructured

### Status Endpoints

- **GET /status/:processId?service=pdf**: Check status of PDF processing
- **GET /status/:processId?service=extract**: Check status of Unstructured processing

## Integration with Frontend

To integrate with a front-end application:

```javascript
// Example upload function
async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('http://localhost:3000/parse', {
    method: 'POST',
    body: formData
  });
  
  return response.json();
}
```

## Benefits Over Browser-Only Parsing

1. **Faster Processing**: Server-side processing is much faster than browser-based parsing
2. **Memory Efficiency**: No memory limitations of the browser
3. **Format Support**: Support for 1000+ file formats via Tika
4. **Improved UX**: Immediate response with progressive updates
5. **Background Processing**: Heavy operations run in the background

## Security Considerations

- In production, add proper authentication and rate limiting
- Restrict file sizes and types as needed
- Set appropriate CORS headers

## Troubleshooting

- **Java Issues**: Ensure Java 11+ is installed and in your PATH
- **Python Dependencies**: Some dependencies may require additional system libraries
- **Port Conflicts**: Change port numbers in `unified-parser.js` if needed 