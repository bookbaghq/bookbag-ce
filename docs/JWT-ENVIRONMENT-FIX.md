# JWT Environment-Specific Initialization Fix

## Problem
Previously, when running `npm run deploy`, the JWT secrets were being generated/updated in **both** `env.development.json` and `env.production.json`, regardless of which environment you were deploying to. This meant:

- Deploying to production would also update development secrets
- Deploying to development would also update production secrets
- No way to maintain separate secrets per environment

## Solution
Modified the JWT initialization system to be **environment-aware**, so it only updates the JWT secrets for the specific environment being deployed.

## Changes Made

### 1. **scripts/init-jwt-secrets.js**
Updated the JWT initialization script to accept an environment parameter:

```javascript
node scripts/init-jwt-secrets.js development  // Only updates dev
node scripts/init-jwt-secrets.js production   // Only updates prod
node scripts/init-jwt-secrets.js              // Updates both (backward compatibility)
```

**Behavior**:
- When called with `development`: Only processes `config/environments/env.development.json`
- When called with `production`: Only processes `config/environments/env.production.json`
- When called without arguments: Processes both files (for backward compatibility with manual `npm run init-jwt`)

### 2. **deploy.sh** (macOS/Linux)
Updated the deployment script to pass the environment to the JWT initializer:

```bash
# Before
npm run init-jwt

# After
node scripts/init-jwt-secrets.js $MODE
```

Now when you deploy:
- Selecting option 1 (Development) only updates `env.development.json`
- Selecting option 2 (Production) only updates `env.production.json`

### 3. **deploy.ps1** (Windows PowerShell)
Same change for Windows deployments:

```powershell
# Before
npm run init-jwt

# After
node scripts/init-jwt-secrets.js $MODE
```

### 4. **package.json**
Added environment-specific JWT initialization scripts:

```json
{
  "scripts": {
    "init-jwt": "node scripts/init-jwt-secrets.js",           // Updates both (manual use)
    "init-jwt:dev": "node scripts/init-jwt-secrets.js development",   // Dev only
    "init-jwt:prod": "node scripts/init-jwt-secrets.js production",   // Prod only
    "dev": "npm run init-jwt:dev && master=development node server.js",
    "prod": "npm run init-jwt:prod && master=production node server.js",
    "start:backend": "npm run init-jwt:prod && master=production node server.js",
    "start:backend:dev": "npm run init-jwt:dev && master=development node server.js"
  }
}
```

## Usage

### Deployment Scripts (Recommended)
```bash
# macOS/Linux
npm run deploy
# Then select:
#   1) Development - only updates env.development.json
#   2) Production  - only updates env.production.json

# Windows
npm run deploy:windows
# Then select the same options
```

### Manual Server Start
```bash
# Start development server (only updates dev secrets)
npm run dev

# Start production server (only updates prod secrets)
npm run prod
```

### Manual JWT Initialization
```bash
# Initialize dev secrets only
npm run init-jwt:dev

# Initialize prod secrets only
npm run init-jwt:prod

# Initialize both (backward compatibility)
npm run init-jwt
```

## Benefits

1. **Environment Isolation**: Each environment maintains its own JWT secrets
2. **Security**: Production secrets remain unchanged when deploying to development
3. **Flexibility**: Can still update both environments when needed (manual `npm run init-jwt`)
4. **Backward Compatible**: Existing workflows that use `npm run init-jwt` still work

## Verification

After deploying to a specific environment, check that only that environment's secrets were updated:

```bash
# Deploy to development
npm run deploy
# Select option 1

# Check that only dev was updated
git diff config/environments/env.development.json  # Should show changes
git diff config/environments/env.production.json   # Should show NO changes
```

## Migration Notes

**No action required!** The changes are backward compatible:

- Existing JWT secrets in your environment files will not be changed
- Only placeholders `(ADD_ACCESS_TOKEN_SECRET)` and `(ADD_REFRESH_TOKEN_SECRET)` will be replaced
- If you've already deployed and have generated secrets, they will remain unchanged

## Technical Details

The JWT initialization script checks for placeholder values:
```javascript
if (config.jwtAPI?.ACCESS_TOKEN_SECRET === '(ADD_ACCESS_TOKEN_SECRET)') {
  config.jwtAPI.ACCESS_TOKEN_SECRET = generateSecret();
}
```

Secrets are only generated if:
1. The placeholder values are present, OR
2. The fields don't exist yet

Once secrets are generated, they persist and won't be overwritten unless you manually reset them to the placeholder values.
