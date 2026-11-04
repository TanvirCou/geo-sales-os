module.exports = {
  apps: [
    {
      name: "geosales-os",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3010",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3010,
      },
    },
  ],
};
