module.exports = {
  apps: [
    {
      name: 'zetadao-portal',
      // 直接使用 node 启动 next，并通过 -r (require) 标志预加载 dotenv
      script: 'node',
      args: '-r dotenv/config ./node_modules/next/dist/bin/next start',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        // 关键：告诉 dotenv 加载哪个文件
        DOTENV_CONFIG_PATH: './.env.local',
        // 关键：为 Node.js 指定 CA 证书路径，修复服务器端的 'fetch failed' 错误
        NODE_EXTRA_CA_CERTS: '/etc/pki/tls/certs/ca-bundle.crt',
      },
    },
  ],
};
