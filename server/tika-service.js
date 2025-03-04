const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// Tika REST server setup
const TIKA_VERSION = '2.9.0';
const TIKA_JAR_PATH = path.join(__dirname, `tika-server-standard-${TIKA_VERSION}.jar`);

// Download Tika JAR if not present
async function downloadTikaJar() {
  if (fs.existsSync(TIKA_JAR_PATH)) {
    console.log('Tika JAR already exists at:', TIKA_JAR_PATH);
    return true;
  }

  console.log('Downloading Apache Tika JAR...');
  const downloadUrl = `https://dlcdn.apache.org/tika/${TIKA_VERSION}/tika-server-standard-${TIKA_VERSION}.jar`;
  
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(TIKA_JAR_PATH);
    https.get(downloadUrl, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download Tika: ${response.statusCode} ${response.statusMessage}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log('Tika JAR downloaded successfully to:', TIKA_JAR_PATH);
        resolve(true);
      });
    }).on('error', (err) => {
      fs.unlink(TIKA_JAR_PATH, () => {}); // Delete the file if download failed
      reject(err);
    });
  });
}

// Start Tika server
function startTikaServer() {
  console.log('Starting Tika Server...');
  const tikaProcess = exec(`java -jar "${TIKA_JAR_PATH}"`, (error) => {
    if (error) {
      console.error('Failed to start Tika server:', error);
    }
  });
  
  tikaProcess.stdout.on('data', (data) => {
    console.log(`Tika: ${data.trim()}`);
  });
  
  tikaProcess.stderr.on('data', (data) => {
    console.error(`Tika Error: ${data.trim()}`);
  });
  
  return tikaProcess;
}

// Main function to initialize Tika
async function initTika() {
  try {
    await downloadTikaJar();
    const tikaProcess = startTikaServer();
    
    // Add a shutdown handler
    process.on('SIGINT', () => {
      console.log('Shutting down Tika server...');
      tikaProcess.kill();
      process.exit(0);
    });
    
    return tikaProcess;
  } catch (error) {
    console.error('Failed to initialize Tika:', error);
    return null;
  }
}

// Export the init function for use in the main server
module.exports = {
  initTika
};

// If this file is run directly, start Tika
if (require.main === module) {
  initTika().catch(console.error);
} 