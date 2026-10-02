/** PM2 process definition for dev VPS (`stron-dev`). */
module.exports = {
  apps: [
    {
      name: "stron-dev",
      cwd: "/root/stron-backend-dev",
      script: "dist/src/server.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      listen_timeout: 30_000,
      kill_timeout: 5_000,
      env: {
        NODE_ENV: "development",
      },
    },
  ],
};
