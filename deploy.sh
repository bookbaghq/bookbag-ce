#!/bin/bash

# Bookbag CE Deployment Script
# This script automates the deployment process

set -e  # Exit on error

echo "🚀 Starting Bookbag CE Deployment..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if PM2 is installed
USE_PM2=true
if ! command -v pm2 &> /dev/null; then
    USE_PM2=false
    echo -e "${YELLOW}⚠️  PM2 is not installed${NC}"
    echo -e "${YELLOW}   For production deployments, it's recommended to install PM2:${NC}"
    echo -e "${BLUE}   npm install -g pm2${NC}"
    echo ""
    echo -e "${YELLOW}   Continuing without PM2 (process will run in foreground)${NC}"
    echo ""
fi

# Ask for deployment mode
echo -e "${BLUE}Select deployment mode:${NC}"
echo "  1) Development (with hot reload)"
echo "  2) Production (optimized build)"
echo ""
echo -n "Enter your choice (1 or 2) [default: 2]: "
read MODE_CHOICE

# Default to production if no choice
if [ -z "$MODE_CHOICE" ]; then
    MODE_CHOICE=2
fi

# Set config file based on choice
if [ "$MODE_CHOICE" = "1" ]; then
    CONFIG_FILE="ecosystem.dev.config.js"
    MODE="development"
    BUILD_REQUIRED=false
    echo -e "${BLUE}📦 Deploying in DEVELOPMENT mode${NC}"
else
    CONFIG_FILE="ecosystem.prod.config.js"
    MODE="production"
    BUILD_REQUIRED=true
    echo -e "${BLUE}📦 Deploying in PRODUCTION mode${NC}"
fi
echo ""

# Determine primary network IP early (for default URL)
NETWORK_IP=""
if command -v ipconfig >/dev/null 2>&1; then
    NETWORK_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)
fi
if [ -z "$NETWORK_IP" ] && command -v hostname >/dev/null 2>&1; then
    NETWORK_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || true)
fi
if [ -z "$NETWORK_IP" ]; then
    NETWORK_IP=$(ip route get 1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src"){print $(i+1); exit}}' || true)
fi
if [ -z "$NETWORK_IP" ]; then
    NETWORK_IP="127.0.0.1"
fi

# Get backend URL from environment or prompt
if [ -z "$NEXT_PUBLIC_BACKEND_URL" ]; then
    DEFAULT_BACKEND_URL="http://${NETWORK_IP}:8080"
    echo -n "Enter your backend URL (e.g., http://your-server-ip:8080) [default: ${DEFAULT_BACKEND_URL}]: "
    read BACKEND_URL
    if [ -z "$BACKEND_URL" ]; then
        # Use detected network IP as default
        export NEXT_PUBLIC_BACKEND_URL="${DEFAULT_BACKEND_URL}"
    else
        export NEXT_PUBLIC_BACKEND_URL=$BACKEND_URL
    fi
fi

# Remove trailing slashes from backend URL
export NEXT_PUBLIC_BACKEND_URL="${NEXT_PUBLIC_BACKEND_URL%/}"

# Ensure URL has http:// or https:// (skip if already has it)
if [[ ! "$NEXT_PUBLIC_BACKEND_URL" =~ ^https?:// ]]; then
    # Only add http:// if there's actual content after it would be added
    if [ -n "$NEXT_PUBLIC_BACKEND_URL" ]; then
        export NEXT_PUBLIC_BACKEND_URL="http://$NEXT_PUBLIC_BACKEND_URL"
    else
        # Fallback to default if somehow empty
        export NEXT_PUBLIC_BACKEND_URL="http://127.0.0.1:8080"
    fi
fi

echo ""
echo -e "${GREEN}✅ Configured Backend URL: $NEXT_PUBLIC_BACKEND_URL${NC}"
echo -e "${BLUE}   (This URL will be used by the frontend to connect to the backend)${NC}"

# Derive URLs for display (local and network)
BACKEND_SCHEME=$(echo "$NEXT_PUBLIC_BACKEND_URL" | sed -E 's#^(https?)://.*#\1#')
BACKEND_HOSTPORT=$(echo "$NEXT_PUBLIC_BACKEND_URL" | sed -E 's#^https?://([^/]+).*#\1#')
if [[ "$BACKEND_HOSTPORT" == *:* ]]; then
    BACKEND_PORT="${BACKEND_HOSTPORT##*:}"
else
    if [ "$BACKEND_SCHEME" = "https" ]; then BACKEND_PORT=443; else BACKEND_PORT=80; fi
fi

# NETWORK_IP already detected earlier, use it here
BACKEND_LOCAL_URL="http://localhost:${BACKEND_PORT}"
BACKEND_NETWORK_URL="${BACKEND_SCHEME}://${NETWORK_IP}:${BACKEND_PORT}"

FRONTEND_LOCAL_URL="http://localhost:3000"
FRONTEND_NETWORK_URL="http://${NETWORK_IP}:3000"
FRONTEND_LOOPBACK_URL="http://127.0.0.1:3000"

# Ensure JWT secrets are initialized before starting services
echo -e "${BLUE}🔐 Initializing JWT secrets...${NC}"
npm run init-jwt
echo -e "${GREEN}✅ JWT secrets ensured${NC}"
echo ""

# Update CORS configuration with frontend URLs (localhost, loopback, and network)
FRONTEND_ORIGIN=$(echo $NEXT_PUBLIC_BACKEND_URL | sed -E 's|:[0-9]+|:3000|')
echo -e "${BLUE}🔒 Updating CORS configuration...${NC}"

if [ -f "config/initializers/cors.json" ]; then
    for ORIGIN in "$FRONTEND_ORIGIN" "$FRONTEND_LOCAL_URL" "$FRONTEND_LOOPBACK_URL" "$FRONTEND_NETWORK_URL"; do
        if [ -n "$ORIGIN" ]; then
            if grep -q "\"$ORIGIN\"" config/initializers/cors.json; then
                echo -e "${GREEN}✅ CORS already configured for: $ORIGIN${NC}"
            else
                node -e "
                const fs = require('fs');
                const origin = process.argv[1];
                const config = JSON.parse(fs.readFileSync('config/initializers/cors.json', 'utf8'));
                if (!Array.isArray(config.origin)) config.origin = [];
                if (!config.origin.includes(origin)) {
                    config.origin.push(origin);
                }
                fs.writeFileSync('config/initializers/cors.json', JSON.stringify(config, null, 4));
                " "$ORIGIN" 2>/dev/null && echo -e "${GREEN}✅ CORS updated: Added $ORIGIN to whitelist${NC}" || echo -e "${YELLOW}⚠️  Could not update CORS automatically for $ORIGIN${NC}"
            fi

            # Also add trailing-slash variant for completeness (even though Origin header omits it)
            ORIGIN_TS="${ORIGIN%/}/"
            if ! grep -q "\"$ORIGIN_TS\"" config/initializers/cors.json; then
                node -e "
                const fs = require('fs');
                const origin = process.argv[1];
                const config = JSON.parse(fs.readFileSync('config/initializers/cors.json', 'utf8'));
                if (!Array.isArray(config.origin)) config.origin = [];
                if (!config.origin.includes(origin)) {
                    config.origin.push(origin);
                }
                fs.writeFileSync('config/initializers/cors.json', JSON.stringify(config, null, 4));
                " "$ORIGIN_TS" 2>/dev/null && echo -e "${GREEN}✅ CORS updated: Added $ORIGIN_TS to whitelist${NC}" || echo -e "${YELLOW}⚠️  Could not update CORS automatically for $ORIGIN_TS${NC}"
            else
                echo -e "${GREEN}✅ CORS already configured for: $ORIGIN_TS${NC}"
            fi
        fi
    done
else
    echo -e "${YELLOW}⚠️  CORS config not found at config/initializers/cors.json${NC}"
fi
echo ""

# Step 1: Install backend dependencies
echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
npm install
echo -e "${GREEN}✅ Backend dependencies installed${NC}"
echo ""

# Step 2: Install frontend dependencies
echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
cd nextjs-app
npm install
echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
echo ""

# Step 3: Update apiConfig.json with backend URL
echo -e "${BLUE}🔧 Updating apiConfig.json with backend URL...${NC}"
node -e "
const fs = require('fs');
const backendUrl = process.argv[1];
const configPath = 'apiConfig.json';
try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config.ApiConfig.main = backendUrl;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
    console.log('✅ Updated apiConfig.json: main = ' + backendUrl);
} catch (error) {
    console.error('⚠️  Error updating apiConfig.json:', error.message);
    process.exit(1);
}
" "$NEXT_PUBLIC_BACKEND_URL"
echo -e "${GREEN}✅ API configuration updated${NC}"
echo ""

# Step 4: Build frontend (only for production)
if [ "$BUILD_REQUIRED" = true ]; then
    echo -e "${BLUE}🏗️  Building frontend...${NC}"
    NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL npm run build
    echo -e "${GREEN}✅ Frontend built successfully${NC}"
    cd ..
else
    echo -e "${YELLOW}⏭️  Skipping build (development mode uses hot reload)${NC}"
    cd ..
fi
echo ""

# Step 5: Start services
if [ "$USE_PM2" = true ]; then
    # PM2 deployment
    echo -e "${BLUE}🛑 Stopping existing PM2 processes...${NC}"
    pm2 delete bookbag-backend-dev 2>/dev/null || true
    pm2 delete bookbag-frontend-dev 2>/dev/null || true
    pm2 delete bookbag-backend-prod 2>/dev/null || true
    pm2 delete bookbag-frontend-prod 2>/dev/null || true
    pm2 delete bookbag-backend 2>/dev/null || true
    pm2 delete bookbag-frontend 2>/dev/null || true
    echo -e "${GREEN}✅ Cleaned up existing processes${NC}"
    echo ""

    echo -e "${BLUE}🚀 Starting services with PM2 (${MODE} mode)...${NC}"
    NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL pm2 start $CONFIG_FILE --update-env
    echo -e "${GREEN}✅ Services started in ${MODE} mode${NC}"
    echo ""

    echo -e "${BLUE}💾 Saving PM2 configuration...${NC}"
    pm2 save
    echo -e "${GREEN}✅ PM2 configuration saved${NC}"
    echo ""

    echo -e "${BLUE}📊 PM2 Status:${NC}"
    pm2 list
    echo ""

    echo -e "${YELLOW}⚙️  To enable PM2 to restart on server reboot, run:${NC}"
    echo -e "${BLUE}   pm2 startup${NC}"
    echo -e "${BLUE}   (Then copy and run the command it outputs)${NC}"
    echo ""
else
    # Non-PM2 deployment
    echo -e "${BLUE}🚀 Starting services without PM2...${NC}"
    echo ""
    
    if [ "$MODE" = "development" ]; then
        echo -e "${YELLOW}Starting in development mode (foreground processes)${NC}"
        echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
        echo ""
        echo -e "${BLUE}Starting backend on port ${BACKEND_PORT}...${NC}"
        echo -e "${BLUE}Starting frontend on port 3000...${NC}"
        echo ""
        
        # Start backend in background
        master=development node server.js > log/backend.log 2>&1 &
        BACKEND_PID=$!
        echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"
        echo ""
        echo -e "${BLUE}🌐 Access your application:${NC}"
        echo "   Frontend Local:   $FRONTEND_LOCAL_URL"
        echo "   Frontend Network: $FRONTEND_NETWORK_URL"
        echo "   Backend Local:    $BACKEND_LOCAL_URL"
        echo "   Backend Network:  $BACKEND_NETWORK_URL"
        echo ""
        
        # Start frontend in foreground
        cd nextjs-app
        NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL npm run dev
    else
        echo -e "${YELLOW}Starting in production mode (foreground processes)${NC}"
        echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
        echo ""
        echo -e "${BLUE}Starting backend on port ${BACKEND_PORT}...${NC}"
        echo -e "${BLUE}Starting frontend on port 3000...${NC}"
        echo ""
        
        # Start backend in background
        master=production node server.js > log/backend.log 2>&1 &
        BACKEND_PID=$!
        echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"
        echo ""
        echo -e "${BLUE}🌐 Access your application:${NC}"
        echo "   Frontend Local:   $FRONTEND_LOCAL_URL"
        echo "   Frontend Network: $FRONTEND_NETWORK_URL"
        echo "   Backend Local:    $BACKEND_LOCAL_URL"
        echo "   Backend Network:  $BACKEND_NETWORK_URL"
        echo ""
        
        # Start frontend in foreground
        cd nextjs-app
        NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL npm start
    fi
fi

# Success message
echo -e "${GREEN}✨ Deployment completed successfully!${NC}"
echo ""

if [ "$USE_PM2" = true ]; then
    echo -e "${BLUE}📝 Quick Commands:${NC}"
    echo "   View logs:    pm2 logs"
    echo "   Restart all:  pm2 restart all"
    echo "   Stop all:     pm2 stop all"
    echo "   Monitor:      pm2 monit"
else
    echo -e "${BLUE}📝 Running without PM2:${NC}"
    echo "   Backend PID: $BACKEND_PID (running in background)"
    echo "   Frontend: Running in foreground"
    echo "   To stop: Press Ctrl+C (stops frontend)"
    echo "   To stop backend: kill $BACKEND_PID"
    echo "   Backend logs: tail -f log/backend.log"
fi

echo ""
echo -e "${BLUE}🌐 Access your application:${NC}"
echo "   Frontend Local:   $FRONTEND_LOCAL_URL"
echo "   Frontend Network: $FRONTEND_NETWORK_URL"
echo "   Backend Local:    $BACKEND_LOCAL_URL"
echo "   Backend Network:  $BACKEND_NETWORK_URL"
echo ""

