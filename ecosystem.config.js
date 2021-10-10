module.exports = {
  apps : [{
    name: 'from-config',
    script: 'server/server.js',
    ignore_watch: 'node_modules',
    wait_ready: true,
    max_memory_restart: '30G',
    "autorestart" : true,
    "node_args":["--max-old-space-size=32392"]
  }],
};
