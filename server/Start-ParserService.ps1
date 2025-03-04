# Start-ParserService.ps1
# PowerShell script to start and monitor the parser service

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverPath = Join-Path -Path $scriptDir -ChildPath "unified-parser.js"

function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    else {
        $input | Write-Output
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Check-Service {
    Write-ColorOutput Blue "Checking if parser service is running on port 3000..."
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/system-status" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        Write-ColorOutput Green "✓ Parser service is running!"
        return $true
    }
    catch {
        if ($_.Exception.Message -like "*Unable to connect*" -or $_.Exception.Message -like "*actively refused*") {
            Write-ColorOutput Yellow "✗ Parser service is not running"
            return $false
        }
        else {
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
                Write-ColorOutput Yellow "⚠ Parser service is running but health endpoint not available"
                return $true
            }
            catch {
                Write-ColorOutput Red "✗ Parser service is not running"
                return $false
            }
        }
    }
}

function Start-Service {
    Write-ColorOutput Blue "Attempting to start parser service..."
    
    if (-not (Test-Path $serverPath)) {
        Write-ColorOutput Red "Error: Server script not found at $serverPath"
        return $false
    }
    
    try {
        # Check if Node.js is installed
        $nodeVersion = node --version
        Write-ColorOutput Blue "Using Node.js $nodeVersion"
        
        # Start as a background job
        $job = Start-Job -ScriptBlock {
            param($path)
            cd (Split-Path -Parent $path)
            node $path
        } -ArgumentList $serverPath
        
        Write-ColorOutput Yellow "Started parser service (Job ID: $($job.Id))"
        Write-ColorOutput Blue "Waiting for service to initialize..."
        
        # Wait for service to be ready
        $retries = 5
        $delay = 2
        
        for ($i = 0; $i -lt $retries; $i++) {
            Start-Sleep -Seconds $delay
            
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
                Write-ColorOutput Green "✓ Parser service is now running!"
                return $true
            }
            catch {
                Write-ColorOutput Yellow "Still waiting for service to start (attempt $($i+1)/$retries)..."
            }
        }
        
        Write-ColorOutput Red "✗ Failed to start parser service after $retries attempts"
        return $false
    }
    catch {
        Write-ColorOutput Red "Error starting service: $_"
        return $false
    }
}

# Main script execution
Write-ColorOutput Blue "===== PARSER SERVICE HEALTH CHECK ====="

$isRunning = Check-Service

if (-not $isRunning) {
    Write-ColorOutput Blue "===== ATTEMPTING TO START SERVICE ====="
    $started = Start-Service
    
    if (-not $started) {
        Write-ColorOutput Red "Failed to start parser service. Please check:"
        Write-ColorOutput Red "1. Node.js is installed and in your PATH"
        Write-ColorOutput Red "2. All dependencies are installed (run 'npm install' in server directory)"
        Write-ColorOutput Red "3. Port 3000 is not used by another application"
        Write-ColorOutput Red "4. Check server logs for errors"
        exit 1
    }
}

Write-ColorOutput Green "===== PARSER SERVICE IS HEALTHY ====="
Write-ColorOutput Blue "You can now proceed with file processing."
Write-ColorOutput Blue "Press Ctrl+C to exit this script (the parser service will continue running)"

# Keep the window open
try {
    while ($true) {
        Start-Sleep -Seconds 10
        $status = Check-Service
        if (-not $status) {
            Write-ColorOutput Red "⚠ Parser service is no longer running!"
            break
        }
    }
}
catch [System.Management.Automation.PipelineStoppedException] {
    # This is thrown when Ctrl+C is pressed
    Write-ColorOutput Blue "Script terminated by user. Parser service should continue running."
} 