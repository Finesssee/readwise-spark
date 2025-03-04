/**
 * Parser Service Health Check Utility
 * 
 * This script checks if the unified parser service is running
 * and attempts to start it if not running.
 */

const axios = require('axios');
const { spawn } = require('child_process');
const { join } = require('path');
const fs = require('fs');

const PARSER_PORT = 3000;
const SERVICE_URL = `http://localhost:${PARSER_PORT}`;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

// Colors for console output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

async function checkServiceHealth() {
  console.log(`${colors.blue}Checking parser service on port ${PARSER_PORT}...${colors.reset}`);
  
  try {
    await axios.get(`${SERVICE_URL}/system-status`, { timeout: 3000 });
    console.log(`${colors.green}✓ Parser service is running!${colors.reset}`);
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log(`${colors.yellow}✗ Parser service is not running${colors.reset}`);
      return false;
    }
    
    // Service might be running but health endpoint not available
    try {
      await axios.get(SERVICE_URL, { timeout: 3000 });
      console.log(`${colors.yellow}⚠ Parser service is running but health endpoint not available${colors.reset}`);
      return true;
    } catch (innerError) {
      console.log(`${colors.red}✗ Parser service is not running${colors.reset}`);
      return false;
    }
  }
}

async function startParserService() {
  console.log(`${colors.blue}Attempting to start parser service...${colors.reset}`);
  
  // Determine server script path
  const serverPath = join(__dirname, 'unified-parser.js');
  
  if (!fs.existsSync(serverPath)) {
    console.error(`${colors.red}Error: Server script not found at ${serverPath}${colors.reset}`);
    return false;
  }
  
  // Start service as a detached process
  const serverProcess = spawn('node', [serverPath], {
    detached: true,
    stdio: 'ignore'
  });
  
  // Detach process so it continues running after this script exits
  serverProcess.unref();
  
  console.log(`${colors.yellow}Started parser service (PID: ${serverProcess.pid})${colors.reset}`);
  console.log(`${colors.blue}Waiting for service to initialize...${colors.reset}`);
  
  // Wait for service to be ready
  for (let i = 0; i < MAX_RETRIES; i++) {
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    
    try {
      await axios.get(SERVICE_URL, { timeout: 3000 });
      console.log(`${colors.green}✓ Parser service is now running!${colors.reset}`);
      return true;
    } catch (error) {
      console.log(`${colors.yellow}Still waiting for service to start (attempt ${i+1}/${MAX_RETRIES})...${colors.reset}`);
    }
  }
  
  console.error(`${colors.red}✗ Failed to start parser service after ${MAX_RETRIES} attempts${colors.reset}`);
  return false;
}

async function main() {
  console.log(`\n${colors.blue}===== PARSER SERVICE HEALTH CHECK =====\n${colors.reset}`);
  
  const isRunning = await checkServiceHealth();
  
  if (!isRunning) {
    console.log(`\n${colors.blue}===== ATTEMPTING TO START SERVICE =====\n${colors.reset}`);
    const started = await startParserService();
    
    if (!started) {
      console.error(`\n${colors.red}Failed to start parser service. Please check:${colors.reset}`);
      console.error(`${colors.red}1. Node.js is installed and working${colors.reset}`);
      console.error(`${colors.red}2. All dependencies are installed (run 'npm install' in server directory)${colors.reset}`);
      console.error(`${colors.red}3. Port ${PARSER_PORT} is not used by another application${colors.reset}`);
      console.error(`${colors.red}4. Check server logs for errors${colors.reset}`);
      process.exit(1);
    }
  }
  
  console.log(`\n${colors.green}===== PARSER SERVICE IS HEALTHY =====\n${colors.reset}`);
  console.log(`${colors.blue}You can now proceed with file processing.${colors.reset}`);
}

// Execute the check
main().catch(error => {
  console.error(`${colors.red}Unexpected error:${colors.reset}`, error);
  process.exit(1);
}); 