# Installing Document Parser Services

This guide will walk you through installing and setting up the document parser services for enhanced document processing.

## Prerequisites

Before proceeding, ensure you have:

1. **Node.js** (version 14 or higher) - [Download](https://nodejs.org/)
2. **Python** (version 3.8 or higher) - [Download](https://www.python.org/downloads/)
3. **Java** (JRE 11 or higher) - [Download](https://www.java.com/download/)

## Step 1: Install Node.js Dependencies

First, install the Node.js dependencies for the parser service:

```bash
cd server
npm install
```

This will install:
- Express and required middleware 
- Axios for HTTP requests
- Form-data for multipart uploads
- Other utility packages

## Step 2: Install Python Dependencies

It's recommended to use a virtual environment for Python dependencies:

### On Windows:

```bash
# Create a virtual environment
python -m venv parser-env

# Activate the environment
parser-env\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### On macOS/Linux:

```bash
# Create a virtual environment
python -m venv parser-env

# Activate the environment
source parser-env/bin/activate

# Install dependencies
pip install -r requirements.txt
```

This will install:
- FastAPI and Uvicorn for API servers
- PyMuPDF for PDF processing
- Unstructured for content extraction
- Supporting libraries

## Step 3: Verify Java Installation

Apache Tika requires Java to run. Verify Java is installed properly:

```bash
java -version
```

You should see output indicating Java version 11 or higher.

## Step 4: Starting the Services

### All-in-one Start

To start all services with a single command:

```bash
npm start
```

### Starting Individual Services

You can also start services individually:

#### Apache Tika:

```bash
npm run tika
```

#### PyMuPDF Service:

```bash
# With activated Python environment
python pymupdf_service.py
```

#### Unstructured Service:

```bash
# With activated Python environment
python unstructured_service.py
```

## Troubleshooting

### Port Conflicts

If you see errors about ports being in use, you can change port configuration in `unified-parser.js`:

```javascript
const config = {
  port: process.env.PORT || 3000,  // Change this
  tikaPort: 9998,                  // Change if needed
  muPdfPort: 3001,                 // Change if needed
  unstructuredPort: 3002           // Change if needed
};
```

### Python Environment Issues

If you encounter issues with Python dependencies:

```bash
# Upgrade pip
python -m pip install --upgrade pip

# Install wheel for better package installation
pip install wheel

# Reinstall requirements
pip install -r requirements.txt
```

### Java Issues

If Tika fails to start:

1. Ensure Java is in your PATH
2. Check that you have permissions to download and execute Java JAR files
3. If behind a proxy, ensure proper proxy settings

## Verifying Installation

Once everything is running, you can verify the installation by accessing:

```
http://localhost:3000/
```

You should see a JSON response with service health status and available endpoints.

## Next Steps

After successful installation, integrate with the frontend by using the API endpoints:

- `POST /parse` - Main document parsing endpoint
- `GET /status/:processId?service=...` - Check processing status

See the main README.md for complete API documentation. 