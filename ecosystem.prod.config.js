module.exports = {
  apps: [
    {
      name: 'bookbag-backend-prod',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        master: 'production',
        NODE_ENV: 'production'
      },
      error_file: './log/pm2-backend-prod-error.log',
      out_file: './log/pm2-backend-prod-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'bookbag-frontend-prod',
      cwd: './nextjs-app',
      script: 'npm',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '../log/pm2-frontend-prod-error.log',
      out_file: '../log/pm2-frontend-prod-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};

