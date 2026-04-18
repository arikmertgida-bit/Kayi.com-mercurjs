const { execSync } = require('child_process');
const https = require('https');
const http = require('http');

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.VITE_MEDUSA_BACKEND_URL || 'http://localhost:9000';

async function fetchPublishableKey() {
  return new Promise((resolve, reject) => {
    const url = `${BACKEND_URL}/key-exchange`;
    const client = url.startsWith('https') ? https : http;
    
    console.log('Fetching publishable API key from:', url);
    
    client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.publishableApiKey) {
            console.log('✓ Publishable API key fetched successfully');
            resolve(json.publishableApiKey);
          } else {
            console.log('⚠ No publishable API key found in response');
            resolve('');
          }
        } catch (error) {
          console.error('Error parsing response:', error);
          resolve('');
        }
      });
    }).on('error', (error) => {
      console.error('Error fetching API key:', error.message);
      resolve('');
    });
  });
}

async function launch() {
  console.log('🚀 Launching vendor panel...\n');
  
  // Fetch the publishable API key
  const apiKey = await fetchPublishableKey();
  
  if (apiKey) {
    process.env.VITE_PUBLISHABLE_API_KEY = apiKey;
    console.log('✓ API key set in environment\n');
  }
  
  // Build then serve as production preview
  console.log('Building vendor panel for production...\n');
  try {
    execSync('./node_modules/.bin/vite build', { stdio: 'inherit', env: process.env });
  } catch (error) {
    console.error('Build failed:', error.message);
    process.exit(1);
  }

  const port = process.env.PORT || '7001';
  console.log(`Starting Vite preview server on port ${port}...\n`);
  try {
    execSync(`./node_modules/.bin/vite preview --host --port ${port}`, { stdio: 'inherit', env: process.env });
  } catch (error) {
    console.error('Error starting preview server:', error.message);
    process.exit(1);
  }
}

launch();
