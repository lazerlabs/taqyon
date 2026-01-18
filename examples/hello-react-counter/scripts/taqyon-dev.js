#!/usr/bin/env node
const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const frontendDir = path.join(projectRoot, 'src');
const backendDir = path.join(projectRoot, 'src-taqyon');
const pkgPath = path.join(projectRoot, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const appName = pkg.name;

const basePort = 5173;
const maxPort = 5273;
const maxAttempts = 5;

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port, '127.0.0.1');
  });
}

function randomPort() {
  return Math.floor(Math.random() * (maxPort - basePort + 1)) + basePort;
}

async function pickPort() {
  for (let i = 0; i < maxAttempts; i += 1) {
    const port = randomPort();
    if (await isPortFree(port)) return port;
  }
  return basePort;
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

async function waitForPort(port) {
  const waitOn = require('wait-on');
  await waitOn({ resources: [`tcp:127.0.0.1:${port}`], timeout: 60000 });
}

function getBinaryPath() {
  if (process.platform === 'win32') {
    return path.join(backendDir, 'build', 'bin', `${appName}.exe`);
  }
  return path.join(backendDir, 'build', 'bin', appName);
}

async function main() {
  if (!fs.existsSync(frontendDir)) {
    console.error('Frontend directory not found at:', frontendDir);
    process.exit(1);
  }
  if (!fs.existsSync(backendDir)) {
    console.error('Backend directory not found at:', backendDir);
    process.exit(1);
  }

  const port = await pickPort();
  const devUrl = `http://localhost:${port}`;
  console.log(`Using dev server: ${devUrl}`);

  const frontendArgs = ['run', '--prefix', frontendDir, 'dev', '--', '--port', String(port), '--strictPort'];
  const frontend = spawn('npm', frontendArgs, { stdio: 'inherit', shell: process.platform === 'win32' });

  frontend.on('exit', (code) => {
    if (code && code !== 0) {
      console.error('Frontend dev server exited with code', code);
      process.exit(code);
    }
  });

  await waitForPort(port);
  await run('npm', ['run', 'app:build'], { cwd: projectRoot });

  const binPath = getBinaryPath();
  if (!fs.existsSync(binPath)) {
    console.error('Application executable not found. Make sure to build successfully first.');
    process.exit(1);
  }

  const backend = spawn(binPath, ['--dev-server', devUrl, '--verbose'], { stdio: 'inherit' });
  backend.on('exit', (code) => {
    frontend.kill();
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
