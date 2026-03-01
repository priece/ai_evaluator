module.exports = {
  apps: [{
    name: 'ai-evaluator',
    script: './server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // 日志配置
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    // 内存限制，超过自动重启
    max_memory_restart: '1G',
    // 重启延迟
    restart_delay: 3000,
    // 最大重启次数
    max_restarts: 5,
    // 最小运行时间
    min_uptime: '10s',
    // 自动重启
    autorestart: true,
    // 崩溃后重启
    exp_backoff_restart_delay: 100,
    // 监控目录（文件变化自动重启）
    watch: false,
    // 忽略监控的文件
    ignore_watch: ['node_modules', 'logs', 'hls', 'data', '.next'],
    // 环境变量
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};
