#!/usr/bin/env node
/* Dependency-free development server. Never intended for production hosting. */
'use strict';
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage: node scripts/serve.js [--host 0.0.0.0] [--port 3000]\nServes this project at / and /Homeworkcalculusextreme/.\nOptional PREVIEW_HOST allows one additional Host hostname. Hidden/private paths are blocked.');
  process.exit(0);
}
function option(name, fallback) { const index = args.indexOf(name); return index < 0 ? fallback : args[index + 1]; }
const host = option('--host', '127.0.0.1');
const port = Number(option('--port', '3000'));
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Port must be an integer from 1024 to 65535.');
const ROOT = path.resolve(__dirname, '..');
const allowedHosts = new Set(['localhost', '127.0.0.1', '[::1]', process.env.PREVIEW_HOST].filter(Boolean));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8' };
http.createServer(async (req, res) => {
  const hostname = (req.headers.host || '').replace(/:\d+$/, '');
  if (!allowedHosts.has(hostname)) { res.writeHead(403); res.end('Host not allowed.'); return; }
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return; }
  let relative;
  try {
    const parsed = new URL(req.url, 'http://localhost');
    if (parsed.pathname === '/Homeworkcalculusextreme') { res.writeHead(301, { Location: 'Homeworkcalculusextreme/' }); res.end(); return; }
    relative = decodeURIComponent(parsed.pathname).replace(/^\/Homeworkcalculusextreme\//, '').replace(/^\//, '');
    if (!relative || relative.endsWith('/')) relative += 'index.html';
    if (relative.split('/').some(part => part.startsWith('.') || part === 'node_modules') || relative.includes('\\')) throw new Error('Private path');
    const resolved = path.resolve(ROOT, relative);
    if (!resolved.startsWith(ROOT + path.sep)) throw new Error('Invalid path');
    const stat = await fs.lstat(resolved);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Not a public file');
    const body = await fs.readFile(resolved);
    res.writeHead(200, { 'Content-Type': types[path.extname(resolved)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    const body = await fs.readFile(path.join(ROOT, '404.html'));
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(req.method === 'HEAD' ? undefined : body);
  }
}).listen(port, host, () => console.log(`ExtremeCalculus preview on ${host}:${port}; root and project-subpath routes ready.`));
