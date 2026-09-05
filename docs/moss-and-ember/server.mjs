import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 5173);
const gameUrl = `http://localhost:${port}`;
function openBrowser() {
  const command = process.platform === 'win32' ? 'explorer.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const browser = spawn(command, [gameUrl], { windowsHide: true, detached: true, stdio: 'ignore' });
  browser.on('error', () => console.log(`Open ${gameUrl} in your browser.`));
  browser.unref();
}
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.md': 'text/plain; charset=utf-8' };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    const path = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!path.startsWith(root.endsWith(sep) ? root : root + sep)) {
      res.writeHead(403).end('Forbidden'); return;
    }
    const content = await readFile(path);
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(content);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
});
server.on('error', async error => {
  if (error.code === 'EADDRINUSE' && process.argv.includes('--open')) {
    try {
      const response = await fetch(gameUrl, { signal: AbortSignal.timeout(2000) });
      if (response.ok && (await response.text()).includes('<title>Moss & Ember')) {
        console.log(`Moss & Ember is already running: ${gameUrl}`);
        openBrowser();
        return;
      }
    } catch { /* Report an occupied port below if it is another application. */ }
  }
  if (error.code === 'EADDRINUSE') console.error(`Port ${port} is already in use. If the game is running, open ${gameUrl}. Otherwise set PORT to another number.`);
  else console.error(error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Moss & Ember is ready: ${gameUrl}`);
  if (process.argv.includes('--open')) openBrowser();
});
