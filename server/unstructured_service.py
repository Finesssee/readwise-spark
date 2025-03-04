"""
Unstructured Integration Service

This service provides a FastAPI-based REST API for parsing various document formats
using the Unstructured library.

To use this service, you need to install:
- pip install fastapi uvicorn unstructured python-multipart
"""

from fastapi import FastAPI, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import tempfile
import os
import time
import logging
import asyncio
import json
from typing import List, Dict, Any, Optional

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="Unstructured Service", description="Document parsing service using Unstructured")

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
    return {"status": "healthy", "service": "Unstructured Parser"}

@app.post("/extract")
async def extract_document(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):
    """
    Extract content from a document using Unstructured
    
    This endpoint provides fast initial extraction and returns basic structure
    while processing the complete document in the background.
    """
    start_time = time.time()
    process_id = f"doc_{int(start_time)}"
    
    # Update processing status
    processing_cache[process_id] = {
        "status": "processing",
        "progress": 0,
        "filename": file.filename,
        "start_time": start_time
    }
    
    try:
        # Save uploaded file to temp location
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp:
            content = await file.read()
            temp.write(content)
            temp_path = temp.name
        
        # Start background processing
        if background_tasks:
            background_tasks.add_task(
                process_document_with_unstructured,
                temp_path,
                process_id,
                file.filename
            )
        
        # Return fast response
        initial_response = {
            "processId": process_id,
            "status": "processing",
            "message": "Document received. Processing started in background."
        }
        
        return initial_response
        
    except Exception as e:
        logger.exception("Error processing document")
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

async def process_document_with_unstructured(file_path: str, process_id: str, original_filename: str):
    """Process a document using Unstructured in the background"""
    try:
        # Import here to not block the API startup if unstructured is not installed
        from unstructured.partition.auto import partition
        
        processing_cache[process_id]["progress"] = 10
        
        # Run partition with appropriate strategy based on file type
        elements = partition(file_path)
        
        processing_cache[process_id]["progress"] = 50
        
        # Extract text and metadata
        result: List[Dict[str, Any]] = []
        
        # Group elements by type for better organization
        element_groups: Dict[str, List[Dict[str, Any]]] = {}
        
        for element in elements:
            element_type = element.category
            element_text = str(element)
            element_metadata = element.metadata if hasattr(element, "metadata") else {}
            
            element_data = {
                "type": element_type,
                "text": element_text,
                "metadata": element_metadata
            }
            
            if element_type not in element_groups:
                element_groups[element_type] = []
            
            element_groups[element_type].append(element_data)
            
            # Yield to allow other requests to be processed
            await asyncio.sleep(0)
        
        processing_cache[process_id]["progress"] = 80
        
        # Extracts common metadata (title, author, etc.)
        metadata = extract_metadata_from_elements(elements, original_filename)
        
        # Finalize processing
        processing_cache[process_id].update({
            "status": "completed",
            "progress": 100,
            "elements": element_groups,
            "elementCount": len(elements),
            "metadata": metadata,
            "completion_time": time.time(),
            "processing_time": time.time() - processing_cache[process_id]["start_time"]
        })
        
        # Clean up temporary file
        os.unlink(file_path)
        
    except Exception as e:
        logger.exception(f"Error in background processing for {process_id}")
        processing_cache[process_id].update({
            "status": "error",
            "error": str(e)
        })
        
        # Attempt to clean up
        try:
            if os.path.exists(file_path):
                os.unlink(file_path)
        except:
            pass

def extract_metadata_from_elements(elements, filename: str) -> Dict[str, Any]:
    """Extract common metadata from elements"""
    metadata = {
        "title": filename,
        "author": "",
        "date": "",
        "source": ""
    }
    
    # Try to find metadata elements
    for element in elements:
        if hasattr(element, "metadata") and element.metadata:
            # Check for title
            if hasattr(element.metadata, "title") and element.metadata.title:
                metadata["title"] = element.metadata.title
            
            # Check for author
            if hasattr(element.metadata, "author") and element.metadata.author:
                metadata["author"] = element.metadata.author
                
            # Check for creation date
            if hasattr(element.metadata, "created") and element.metadata.created:
                metadata["date"] = element.metadata.created
                
    return metadata

if __name__ == "__main__":
    import uvicorn
    port = 3002
    logger.info(f"Starting Unstructured service on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port) 