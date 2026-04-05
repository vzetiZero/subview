module.exports = {
  apps: [
    {
      name: "node-admin-ts-mvp",
      cwd: __dirname,
      script: "dist/server.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        APP_BASE_URL: "https://your-domain.com",
        TRUST_PROXY: "true",
        SESSION_SECURE: "true",
        SESSION_SAME_SITE: "lax",
        AUTO_SYNC_FRONTEND: "true"
      }
    }
  ]
};
