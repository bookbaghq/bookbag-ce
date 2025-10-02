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

# Get backend URL from environment or prompt
if [ -z "$NEXT_PUBLIC_BACKEND_URL" ]; then
    echo -n "Enter your backend URL (e.g., http://your-server-ip:8080): "
    read BACKEND_URL
    export NEXT_PUBLIC_BACKEND_URL=$BACKEND_URL
fi

# Ensure URL has http:// or https://
if [[ ! "$NEXT_PUBLIC_BACKEND_URL" =~ ^https?:// ]]; then
    export NEXT_PUBLIC_BACKEND_URL="http://$NEXT_PUBLIC_BACKEND_URL"
fi

echo -e "${BLUE}📦 Backend URL: $NEXT_PUBLIC_BACKEND_URL${NC}"

# Update CORS configuration with frontend URL
FRONTEND_ORIGIN=$(echo $NEXT_PUBLIC_BACKEND_URL | sed -E 's|:[0-9]+|:3000|')
echo -e "${BLUE}🔒 Updating CORS configuration...${NC}"

if [ -f "config/initializers/cors.json" ]; then
    # Check if origin already exists
    if grep -q "\"$FRONTEND_ORIGIN\"" config/initializers/cors.json; then
        echo -e "${GREEN}✅ CORS already configured for: $FRONTEND_ORIGIN${NC}"
    else
        # Add origin using Node.js (more reliable than sed/jq)
        node -e "
        const fs = require('fs');
        const origin = process.argv[1];
        const config = JSON.parse(fs.readFileSync('config/initializers/cors.json', 'utf8'));
        if (!Array.isArray(config.origin)) config.origin = [];
        if (!config.origin.includes(origin)) {
            config.origin.push(origin);
        }
        fs.writeFileSync('config/initializers/cors.json', JSON.stringify(config, null, 4));
        " "$FRONTEND_ORIGIN" 2>/dev/null && echo -e "${GREEN}✅ CORS updated: Added $FRONTEND_ORIGIN to whitelist${NC}" || echo -e "${YELLOW}⚠️  Could not update CORS automatically${NC}"
    fi
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

# Step 3: Build frontend (only for production)
if [ "$BUILD_REQUIRED" = true ]; then
    echo -e "${BLUE}🏗️  Building frontend...${NC}"
    npm run build
    echo -e "${GREEN}✅ Frontend built successfully${NC}"
    cd ..
else
    echo -e "${YELLOW}⏭️  Skipping build (development mode uses hot reload)${NC}"
    cd ..
fi
echo ""

# Step 4: Start services
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
    pm2 start $CONFIG_FILE
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
        echo -e "${BLUE}Starting backend on port 8080...${NC}"
        echo -e "${BLUE}Starting frontend on port 3000...${NC}"
        echo ""
        
        # Start backend in background
        master=development node server.js > log/backend.log 2>&1 &
        BACKEND_PID=$!
        echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"
        
        # Start frontend in foreground
        cd nextjs-app
        npm run dev
    else
        echo -e "${YELLOW}Starting in production mode (foreground processes)${NC}"
        echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
        echo ""
        echo -e "${BLUE}Starting backend on port 8080...${NC}"
        echo -e "${BLUE}Starting frontend on port 3000...${NC}"
        echo ""
        
        # Start backend in background
        master=production node server.js > log/backend.log 2>&1 &
        BACKEND_PID=$!
        echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"
        
        # Start frontend in foreground
        cd nextjs-app
        npm start
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
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8080"
echo ""

