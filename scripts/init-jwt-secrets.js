#!/usr/bin/env node

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

/**
 * Initialize JWT secrets in environment config files
 * Automatically generates secure random secrets if placeholders are found
 */

const generateSecret = () => {
  return crypto.randomBytes(64).toString('hex');
};

const initJwtSecrets = (envFile) => {
  const envPath = path.join(__dirname, '..', envFile);
  
  if (!fs.existsSync(envPath)) {
    console.log(`⚠️  Environment file not found: ${envFile}`);
    return false;
  }

  try {
    const content = fs.readFileSync(envPath, 'utf8');
    const config = JSON.parse(content);

    let updated = false;

    // Check and update ACCESS_TOKEN_SECRET
    if (config.jwtAPI?.ACCESS_TOKEN_SECRET === '(ADD_ACCESS_TOKEN_SECRET)') {
      config.jwtAPI.ACCESS_TOKEN_SECRET = generateSecret();
      updated = true;
      console.log(`✅ Generated new ACCESS_TOKEN_SECRET for ${envFile}`);
    }

    // Check and update REFRESH_TOKEN_SECRET
    if (config.jwtAPI?.REFRESH_TOKEN_SECRET === '(ADD_REFRESH_TOKEN_SECRET)') {
      config.jwtAPI.REFRESH_TOKEN_SECRET = generateSecret();
      updated = true;
      console.log(`✅ Generated new REFRESH_TOKEN_SECRET for ${envFile}`);
    }

    // Write back if updated
    if (updated) {
      fs.writeFileSync(envPath, JSON.stringify(config, null, 4), 'utf8');
      console.log(`💾 Updated ${envFile} with new JWT secrets`);
      return true;
    } else {
      console.log(`✓ JWT secrets already configured in ${envFile}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error processing ${envFile}:`, error.message);
    return false;
  }
};

// Main execution
console.log('\n🔐 Checking JWT secrets...\n');

// Check if a specific environment was provided as argument
const targetEnv = process.argv[2]; // 'development' or 'production'

let updated = false;

if (targetEnv === 'development') {
  // Only update development
  console.log('🎯 Target environment: development\n');
  updated = initJwtSecrets('config/environments/env.development.json');
} else if (targetEnv === 'production') {
  // Only update production
  console.log('🎯 Target environment: production\n');
  updated = initJwtSecrets('config/environments/env.production.json');
} else {
  // No specific environment provided, update both (backward compatibility)
  console.log('🎯 Target environment: all (no specific env provided)\n');
  const devUpdated = initJwtSecrets('config/environments/env.development.json');
  const prodUpdated = initJwtSecrets('config/environments/env.production.json');
  updated = devUpdated || prodUpdated;
}

if (updated) {
  console.log('\n✨ JWT secrets have been initialized!\n');
} else {
  console.log('\n✓ All JWT secrets are already configured.\n');
}

