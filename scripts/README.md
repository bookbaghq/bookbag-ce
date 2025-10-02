# Scripts

## JWT Secrets Initialization

The `init-jwt-secrets.js` script automatically generates secure JWT secrets for both development and production environments.

### Automatic Initialization

JWT secrets are **automatically generated** when you start the server if they haven't been set yet. The server checks for placeholder values `(ADD_ACCESS_TOKEN_SECRET)` and `(ADD_REFRESH_TOKEN_SECRET)` and replaces them with secure random 128-character hexadecimal strings.

### Usage

**Automatic (Recommended):**
```bash
# Start development server - JWT secrets auto-generated if needed
npm run dev

# Start production server - JWT secrets auto-generated if needed  
npm run prod
```

**Manual:**
```bash
# Manually initialize JWT secrets for both environments
npm run init-jwt
```

### How It Works

1. On server startup, the script checks the environment file (`env.development.json` or `env.production.json`)
2. If it finds placeholder values like `(ADD_ACCESS_TOKEN_SECRET)`, it generates a new secure random secret
3. The config file is updated with the new secrets
4. Server continues starting normally

### Security

- Secrets are generated using Node.js `crypto.randomBytes(64)` for maximum security
- Each secret is 128 hexadecimal characters (512 bits of entropy)
- Secrets are never regenerated once set (preserving existing JWTs)
- The script only modifies files if placeholder values are detected

### Environment Files

- `config/environments/env.development.json` - Development environment
- `config/environments/env.production.json` - Production environment

Both files should have a `jwtAPI` section:
```json
{
  "jwtAPI": {
    "ACCESS_TOKEN_SECRET": "(ADD_ACCESS_TOKEN_SECRET)",
    "REFRESH_TOKEN_SECRET": "(ADD_REFRESH_TOKEN_SECRET)"
  }
}
```

After initialization, these placeholders are replaced with actual secure secrets.

