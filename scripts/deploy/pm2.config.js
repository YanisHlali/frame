module.exports = {
  apps: [
    {
      name: 'twin-peaks-bot',
      script: './scripts/deploy/scheduler-vps.js',
      cron_restart: '*/10 * * * *',
      autorestart: false,
      cwd: '/home/ubuntu/twin-peaks-frame-bot'
    }
  ]
};