module.exports = {
  apps : [{
    name: 'from-config',
    script: 'server/server.js',
    watch: '.',
    ignore_watch: 'node_modules',
    wait_ready: true,
    max_memory_restart: '15G'
  }],
};
