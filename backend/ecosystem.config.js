// PM2 Ecosystem Configuration
// PM2 ile backend ve frontend uygulamalarını yönetmek için

module.exports = {
  apps: [
    {
      name: 'backend',
      cwd: '/var/www/qrvirtualcard/backend',
      script: 'venv/bin/uvicorn',
      args: 'main:app --host 0.0.0.0 --port 8000 --workers 4',
      interpreter: 'none',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PYTHONPATH: '/var/www/qrvirtualcard/backend'
      },
      error_file: '/var/www/qrvirtualcard/backend/logs/pm2-error.log',
      out_file: '/var/www/qrvirtualcard/backend/logs/pm2-out.log',
      log_file: '/var/www/qrvirtualcard/backend/logs/pm2-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};

