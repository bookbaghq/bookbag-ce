module.exports = {
  apps: [
    {
      name: 'bookbag-backend-dev',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        master: 'development',
        NODE_ENV: 'development'
      },
      error_file: './log/pm2-backend-dev-error.log',
      out_file: './log/pm2-backend-dev-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'bookbag-frontend-dev',
      cwd: './nextjs-app',
      script: 'npm',
      args: 'run dev',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'
      },
      error_file: '../log/pm2-frontend-dev-error.log',
      out_file: '../log/pm2-frontend-dev-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};

