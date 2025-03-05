module.exports = {
    apps: [
      {
        name: 'whatsapp-backend',
        script: 'index.js',
        instances: 1,
        exec_mode: 'fork',
        ignore_watch: ['node_modules', 'logs', './package.json'], 
        log_date_format: "DD-MM HH:mm:ss Z",
        log_type: "json",
        log_file: './logs/whatsapp-backend.log',  // Specify the path for your logs
        out_file: './logs/out.log',              // Specify the output file for logs
        error_file: './logs/error.log',     
          
        max_memory_restart: '500M', 
        env: {
          NODE_ENV: 'DEVELOPMENT',
          PORT: 8000,
        },
        env_production: {
          NODE_ENV: 'PRODUCTION',
          PORT: 8000,
        },
        env_worker: {
          ROLE: 'queue-worker',
          NODE_ENV: 'production'
        }
      },
      {
        name: 'queue-worker',
        script: 'config/queue.js', 
        instances: 4, 
        exec_mode: 'cluster',
        autorestart: true
      },
      {
        name: 'auto-scaler',
        script: 'auto-scaler.js',
        env: {
          MAX_INSTANCES: 8,
          CPU_THRESHOLD: 70, 
          MEMORY_THRESHOLD: 80 
        },
        autorestart: true
      }
    ],
  };