#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Update CORS configuration with frontend origin
 * Usage: node scripts/update-cors.js <frontend-url>
 * Example: node scripts/update-cors.js http://147.182.251.85:3000
 */

const frontendUrl = process.argv[2];

if (!frontendUrl) {
  console.error('❌ Error: Please provide frontend URL');
  console.log('Usage: node scripts/update-cors.js <frontend-url>');
  console.log('Example: node scripts/update-cors.js http://147.182.251.85:3000');
  process.exit(1);
}

const corsConfigPath = path.join(__dirname, '..', 'config', 'initializers', 'cors.json');

try {
  // Read current CORS config
  const corsConfig = JSON.parse(fs.readFileSync(corsConfigPath, 'utf8'));
  
  // Update origin
  if (!Array.isArray(corsConfig.origin)) {
    corsConfig.origin = [];
  }
  
  // Add frontend URL if not already present
  if (!corsConfig.origin.includes(frontendUrl)) {
    corsConfig.origin.push(frontendUrl);
    console.log(`✅ Added ${frontendUrl} to CORS whitelist`);
  } else {
    console.log(`ℹ️  ${frontendUrl} already in CORS whitelist`);
  }
  
  // Write back
  fs.writeFileSync(corsConfigPath, JSON.stringify(corsConfig, null, 4), 'utf8');
  console.log('✅ CORS configuration updated successfully');
  console.log(`📋 Current origins: ${corsConfig.origin.join(', ')}`);
  
} catch (error) {
  console.error('❌ Error updating CORS configuration:', error.message);
  process.exit(1);
}

