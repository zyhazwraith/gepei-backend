module.exports = {
  apps: [
    {
      name: 'gepei-server',
      script: 'npm',
      args: 'run server:dev',
      node_args: '--max-old-space-size=1024',
      env: {
        NODE_ENV: 'development',
      },
    },
    {
      name: 'gepei-client',
      script: 'npm',
      args: 'run client:dev',
      node_args: '--max-old-space-size=1024',
      env: {
        NODE_ENV: 'development',
      },
    }
  ],
};
