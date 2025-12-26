/**
 * PM2 Ecosystem Configuration
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 start ecosystem.config.js --env production
 *   pm2 restart ecosystem.config.js
 *   pm2 stop ecosystem.config.js
 *   pm2 delete ecosystem.config.js
 */

module.exports = {
  apps: [
    {
      name: 'next-shadcn-dashboard',
      script: 'npm',
      args: 'start',
      cwd: './',
      instances: 1, // 或者使用 'max' 来使用所有 CPU 核心
      exec_mode: 'fork', // 'cluster' 模式需要修改代码以支持
      watch: false, // 生产环境建议关闭
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      // 日志配置
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // 自动重启配置
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      // 其他配置
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: true
    }
  ]
};
