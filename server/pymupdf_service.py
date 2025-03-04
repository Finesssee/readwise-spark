"""
PyMuPDF Integration Service

This service provides a FastAPI-based REST API for parsing PDF files using PyMuPDF.
To use this service, you need to install:
- pip install fastapi uvicorn pymupdf python-multipart
"""

from fastapi import FastAPI, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import fitz  # PyMuPDF
import json
import io
import time
import os
import tempfile
import asyncio
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="PyMuPDF Service", description="PDF parsing service using PyMuPDF")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory cache for document processing status
processing_cache = {}

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "healthy", "service": "PyMuPDF Parser"}

@app.post("/parse-pdf")
async def parse_pdf(
    file: UploadFile = File(...), 
    background_tasks: BackgroundTasks = None
):
    """
    Parse a PDF file and extract metadata, table of contents, and text
    
    This endpoint provides fast initial parsing and returns basic metadata
    while processing the complete document in the background.
    """
    start_time = time.time()
    process_id = f"pdf_{int(start_time)}"
    
    # Update processing status
    processing_cache[process_id] = {
        "status": "processing",
        "progress": 0,
        "filename": file.filename,
        "start_time": start_time
    }
    
    try:
        # Read first chunk of file for initial parsing
        content = await file.read(1024 * 1024)  # Read first 1MB for initial metadata
        pdf_stream = io.BytesIO(content)
        
        # Process with PyMuPDF for fast initial parsing
        doc = fitz.open(stream=pdf_stream, filetype="pdf")
        
        # Extract basic metadata (fast)
        metadata = {
            "title": doc.metadata.get("title", ""),
            "author": doc.metadata.get("author", ""),
            "subject": doc.metadata.get("subject", ""),
            "keywords": doc.metadata.get("keywords", ""),
            "creator": doc.metadata.get("creator", ""),
            "producer": doc.metadata.get("producer", ""),
            "pageCount": len(doc),
            "creationDate": doc.metadata.get("creationDate", ""),
            "modDate": doc.metadata.get("modDate", ""),
        }
        
        # Schedule background processing for full document
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        temp_file.write(content)
        
        # Read the rest of the file
        while True:
            chunk = await file.read(1024 * 1024)  # Read in 1MB chunks
            if not chunk:
                break
            temp_file.write(chunk)
        
        temp_file.close()
        
        # Add background task for complete processing
        if background_tasks:
            background_tasks.add_task(
                process_complete_pdf, 
                temp_file.name, 
                process_id
            )
        
        # Return fast response with basic info
        initial_response = {
            "processId": process_id,
            "metadata": metadata,
            "status": "processing",
            "initialProcessingTime": time.time() - start_time,
            "message": "Basic metadata extracted. Complete document processing in progress."
        }
        
        # Update cache with partial results
        processing_cache[process_id].update({
            "progress": 20,
            "metadata": metadata,
            "partial_results": True
        })
        
        return initial_response
        
    except Exception as e:
        logger.exception("Error processing PDF")
        if process_id in processing_cache:
            processing_cache[process_id].update({
                "status": "error",
                "error": str(e)
            })
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "processId": process_id}
        )

@app.get("/status/{process_id}")
async def get_processing_status(process_id: str):
    """Get the current status of a processing job"""
    if process_id not in processing_cache:
        return JSONResponse(
            status_code=404,
            content={"error": "Process ID not found"}
        )
    
    return processing_cache[process_id]


async def process_complete_pdf(pdf_path: str, process_id: str):
    """Process the complete PDF in the background"""
    try:
        doc = fitz.open(pdf_path)
        page_count = len(doc)
        
        # Update status to processing full document
        processing_cache[process_id]["progress"] = 25
        
        # Extract table of contents
        toc = doc.get_toc()
        table_of_contents = [
            {"title": item[1], "page": item[2], "level": item[0]}
            for item in toc
        ]
        
        # Update progress
        processing_cache[process_id]["progress"] = 40
        processing_cache[process_id]["tableOfContents"] = table_of_contents
        
        # Process text and images
        pages_text = []
        for i in range(min(50, page_count)):  # Process first 50 pages or all if less
            # Yield to allow other requests to be processed
            await asyncio.sleep(0)
            
            page = doc[i]
            text = page.get_text()
            pages_text.append({
                "number": i + 1,
                "text": text[:2000] + ("..." if len(text) > 2000 else "")
            })
            
            # Update progress (40-90%)
            progress = 40 + int((i / min(50, page_count)) * 50)
            processing_cache[process_id]["progress"] = progress
        
        # Finalize processing
        processing_cache[process_id].update({
            "status": "completed",
            "progress": 100,
            "pagesText": pages_text,
            "pageCount": page_count,
            "completion_time": time.time(),
            "processing_time": time.time() - processing_cache[process_id]["start_time"]
        })
        
        # Clean up temporary file
        os.unlink(pdf_path)
        
    except Exception as e:
        logger.exception(f"Error in background processing for {process_id}")
        processing_cache[process_id].update({
            "status": "error",
            "error": str(e)
        })
        
        # Attempt to clean up
        try:
            if os.path.exists(pdf_path):
                os.unlink(pdf_path)
        except:
            pass

if __name__ == "__main__":
    import uvicorn
    port = 3001
    logger.info(f"Starting PyMuPDF service on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port) 