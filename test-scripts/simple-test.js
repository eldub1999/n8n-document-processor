console.log('Simple test script is running.');
console.log('Node version:', process.version);
console.log('Current directory:', process.cwd());
console.log('Environment variables:', Object.keys(process.env).length);

// Simple test to check for the specific request ID
const fs = require('fs');

console.log('Starting simple request ID check...');
console.log('Request ID to check: b742794a-e58b-4f43-b057-f56499f7d95c');

// Write to a file
fs.writeFileSync('debug-output.txt', `
Current directory: ${process.cwd()}
Request ID to check: b742794a-e58b-4f43-b057-f56499f7d95c
Environment variables: ${Object.keys(process.env).length}
`); 