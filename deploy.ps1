# Bookbag CE Deployment Script for Windows PowerShell
# This script automates the deployment process

# Exit on error
$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Bookbag CE Deployment..." -ForegroundColor Cyan
Write-Host ""

# Check if PM2 is installed
$USE_PM2 = $true
try {
    $null = Get-Command pm2 -ErrorAction Stop
} catch {
    $USE_PM2 = $false
    Write-Host "⚠️  PM2 is not installed" -ForegroundColor Yellow
    Write-Host "   For production deployments, it's recommended to install PM2:" -ForegroundColor Yellow
    Write-Host "   npm install -g pm2" -ForegroundColor Blue
    Write-Host ""
    Write-Host "   Continuing without PM2 (process will run in foreground)" -ForegroundColor Yellow
    Write-Host ""
}

# Ask for deployment mode
Write-Host "Select deployment mode:" -ForegroundColor Blue
Write-Host "  1) Development (with hot reload)"
Write-Host "  2) Production (optimized build)"
Write-Host ""
$MODE_CHOICE = Read-Host "Enter your choice (1 or 2) [default: 2]"

# Default to production if no choice
if ([string]::IsNullOrWhiteSpace($MODE_CHOICE)) {
    $MODE_CHOICE = "2"
}

# Set config based on choice
if ($MODE_CHOICE -eq "1") {
    $CONFIG_FILE = "ecosystem.dev.config.js"
    $MODE = "development"
    $BUILD_REQUIRED = $false
    Write-Host "📦 Deploying in DEVELOPMENT mode" -ForegroundColor Blue
} else {
    $CONFIG_FILE = "ecosystem.prod.config.js"
    $MODE = "production"
    $BUILD_REQUIRED = $true
    Write-Host "📦 Deploying in PRODUCTION mode" -ForegroundColor Blue
}
Write-Host ""

# Get backend URL from environment or prompt
if ([string]::IsNullOrWhiteSpace($env:NEXT_PUBLIC_BACKEND_URL)) {
    $BACKEND_URL = Read-Host "Enter your backend URL (e.g., http://your-server-ip:8080) [default: http://127.0.0.1:8080]"
    if ([string]::IsNullOrWhiteSpace($BACKEND_URL)) {
        # Use default if nothing entered
        $env:NEXT_PUBLIC_BACKEND_URL = "http://127.0.0.1:8080"
    } else {
        $env:NEXT_PUBLIC_BACKEND_URL = $BACKEND_URL
    }
}

# Ensure URL has http:// or https://
if ($env:NEXT_PUBLIC_BACKEND_URL -notmatch '^https?://') {
    # Only add http:// if there's actual content
    if (-not [string]::IsNullOrWhiteSpace($env:NEXT_PUBLIC_BACKEND_URL)) {
        $env:NEXT_PUBLIC_BACKEND_URL = "http://$($env:NEXT_PUBLIC_BACKEND_URL)"
    } else {
        # Fallback to default if somehow empty
        $env:NEXT_PUBLIC_BACKEND_URL = "http://127.0.0.1:8080"
    }
}

Write-Host "📦 Backend URL: $($env:NEXT_PUBLIC_BACKEND_URL)" -ForegroundColor Blue

# Update CORS configuration with frontend URL
$FRONTEND_ORIGIN = $env:NEXT_PUBLIC_BACKEND_URL -replace ':\d+$', ':3000'
Write-Host "🔒 Updating CORS configuration..." -ForegroundColor Blue
Write-Host ""

$corsConfigPath = "config\initializers\cors.json"
if (Test-Path $corsConfigPath) {
    # Check if origin already exists
    $corsContent = Get-Content $corsConfigPath -Raw
    if ($corsContent -match [regex]::Escape("""$FRONTEND_ORIGIN""")) {
        Write-Host "✅ CORS already configured for: $FRONTEND_ORIGIN" -ForegroundColor Green
    } else {
        # Add origin using Node.js
        try {
            $nodeScript = @"
const fs = require('fs');
const origin = process.argv[1];
const config = JSON.parse(fs.readFileSync('$($corsConfigPath.Replace('\', '/'))', 'utf8'));
if (!Array.isArray(config.origin)) config.origin = [];
if (!config.origin.includes(origin)) {
    config.origin.push(origin);
}
fs.writeFileSync('$($corsConfigPath.Replace('\', '/'))', JSON.stringify(config, null, 4));
"@
            node -e $nodeScript $FRONTEND_ORIGIN 2>$null
            Write-Host "✅ CORS updated: Added $FRONTEND_ORIGIN to whitelist" -ForegroundColor Green
        } catch {
            Write-Host "⚠️  Could not update CORS automatically" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "⚠️  CORS config not found at $corsConfigPath" -ForegroundColor Yellow
}
Write-Host ""

# Step 1: Install backend dependencies
Write-Host "📦 Installing backend dependencies..." -ForegroundColor Blue
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
Write-Host ""

# Step 2: Install frontend dependencies
Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Blue
Set-Location nextjs-app
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
Write-Host ""

# Step 3: Build frontend (only for production)
if ($BUILD_REQUIRED) {
    Write-Host "🏗️  Building frontend..." -ForegroundColor Blue
    npm run build
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Write-Host "✅ Frontend built successfully" -ForegroundColor Green
    Set-Location ..
} else {
    Write-Host "⏭️  Skipping build (development mode uses hot reload)" -ForegroundColor Yellow
    Set-Location ..
}
Write-Host ""

# Step 4: Start services
if ($USE_PM2) {
    # PM2 deployment
    Write-Host "🛑 Stopping existing PM2 processes..." -ForegroundColor Blue
    pm2 delete bookbag-backend-dev 2>$null
    pm2 delete bookbag-frontend-dev 2>$null
    pm2 delete bookbag-backend-prod 2>$null
    pm2 delete bookbag-frontend-prod 2>$null
    pm2 delete bookbag-backend 2>$null
    pm2 delete bookbag-frontend 2>$null
    Write-Host "✅ Cleaned up existing processes" -ForegroundColor Green
    Write-Host ""

    Write-Host "🚀 Starting services with PM2 ($MODE mode)..." -ForegroundColor Blue
    pm2 start $CONFIG_FILE
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Write-Host "✅ Services started in $MODE mode" -ForegroundColor Green
    Write-Host ""

    Write-Host "💾 Saving PM2 configuration..." -ForegroundColor Blue
    pm2 save
    Write-Host "✅ PM2 configuration saved" -ForegroundColor Green
    Write-Host ""

    Write-Host "📊 PM2 Status:" -ForegroundColor Blue
    pm2 list
    Write-Host ""

    Write-Host "⚙️  To enable PM2 to restart on server reboot, run:" -ForegroundColor Yellow
    Write-Host "   pm2 startup" -ForegroundColor Blue
    Write-Host "   (Then copy and run the command it outputs)" -ForegroundColor Blue
    Write-Host ""
} else {
    # Non-PM2 deployment
    Write-Host "🚀 Starting services without PM2..." -ForegroundColor Blue
    Write-Host ""
    
    if ($MODE -eq "development") {
        Write-Host "Starting in development mode (foreground processes)" -ForegroundColor Yellow
        Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Starting backend on port 8080..." -ForegroundColor Blue
        Write-Host "Starting frontend on port 3000..." -ForegroundColor Blue
        Write-Host ""
        
        # Start backend in background
        $env:master = "development"
        $backendJob = Start-Job -ScriptBlock {
            Set-Location $using:PWD
            $env:master = "development"
            node server.js
        }
        Write-Host "✅ Backend started (Job ID: $($backendJob.Id))" -ForegroundColor Green
        
        # Start frontend in foreground
        Set-Location nextjs-app
        npm run dev
    } else {
        Write-Host "Starting in production mode (foreground processes)" -ForegroundColor Yellow
        Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Starting backend on port 8080..." -ForegroundColor Blue
        Write-Host "Starting frontend on port 3000..." -ForegroundColor Blue
        Write-Host ""
        
        # Start backend in background
        $env:master = "production"
        $backendJob = Start-Job -ScriptBlock {
            Set-Location $using:PWD
            $env:master = "production"
            node server.js
        }
        Write-Host "✅ Backend started (Job ID: $($backendJob.Id))" -ForegroundColor Green
        
        # Start frontend in foreground
        Set-Location nextjs-app
        npm start
    }
}

# Success message
Write-Host "✨ Deployment completed successfully!" -ForegroundColor Green
Write-Host ""

if ($USE_PM2) {
    Write-Host "📝 Quick Commands:" -ForegroundColor Blue
    Write-Host "   View logs:    pm2 logs"
    Write-Host "   Restart all:  pm2 restart all"
    Write-Host "   Stop all:     pm2 stop all"
    Write-Host "   Monitor:      pm2 monit"
} else {
    Write-Host "📝 Running without PM2:" -ForegroundColor Blue
    Write-Host "   Backend Job ID: $($backendJob.Id) (running in background)"
    Write-Host "   Frontend: Running in foreground"
    Write-Host "   To stop: Press Ctrl+C (stops frontend)"
    Write-Host "   To stop backend: Stop-Job -Id $($backendJob.Id); Remove-Job -Id $($backendJob.Id)"
    Write-Host "   View backend job: Receive-Job -Id $($backendJob.Id) -Keep"
}

Write-Host ""
Write-Host "🌐 Access your application:" -ForegroundColor Blue
Write-Host "   Frontend: http://localhost:3000"
Write-Host "   Backend:  http://localhost:8080"
Write-Host ""

