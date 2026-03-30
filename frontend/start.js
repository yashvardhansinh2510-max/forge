const { spawn } = require('child_process');

const child = spawn('npx', ['next', 'dev', '-p', '3000'], {
  cwd: '/app/apps/web',
  env: {
    ...process.env,
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/forge',
  },
  stdio: 'inherit',
});

child.on('exit', (code) => process.exit(code || 0));
