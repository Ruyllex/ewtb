// PM2 Ecosystem Configuration
// Para gestionar la aplicación en producción con PM2

module.exports = {
  apps: [
    {
      name: 'newtube',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/newtube',
      instances: 1, // Para escalar, cambia a 'max' o un número específico
      exec_mode: 'cluster', // Modo cluster para mejor rendimiento
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Configuración de logs
      error_file: '/var/log/pm2/newtube-error.log',
      out_file: '/var/log/pm2/newtube-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Auto-restart en caso de error
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Watch (opcional - desactivado en producción)
      watch: false,
      
      // Configuración de memoria
      max_memory_restart: '1G',
      
      // Health check
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};

// Para usar:
// 1. Instala PM2: npm install -g pm2
// 2. Inicia la app: pm2 start ecosystem.config.js
// 3. Guarda la configuración: pm2 save
// 4. Configura auto-start: pm2 startup
// 5. Ver logs: pm2 logs newtube
// 6. Ver estado: pm2 status
// 7. Reiniciar: pm2 restart newtube
// 8. Detener: pm2 stop newtube

