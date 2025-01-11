module.exports = {
    apps: [
      {
        name: 'whatsapp-backend',
        script: 'index.js',
        instances: 2,
        watch: true, 
        ignore_watch: ['node_modules', 'logs', './package.json'], 
        log_date_format: "DD-MM HH:mm:ss Z",
        log_type: "json",
        // log_file: './logs/whatsapp-backend.log',  // Specify the path for your logs
        // out_file: './logs/out.log',              // Specify the output file for logs
        // error_file: './logs/error.log',     
          
        max_memory_restart: '500M', 
        env: {
          NODE_ENV: 'development',
          PORT: 8000,
        },
        env_production: {
          NODE_ENV: 'production',
          exec_mode: "cluster_mode",
        },
      },
    ],
  };