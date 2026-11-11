import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import { WebSocketServer } from 'ws';
import { WORKSPACE_ROOT, ensureWorkspace } from './workspace.js';
import { createApiRouter } from './api.js';
import { createSearchRouter } from './search.js';
import { attachTerminalServer } from './terminal.js';

const PORT = Number(process.env.FORGE_PORT ?? 4760);
const DIST_DIR = path.resolve(process.cwd(), 'dist');

ensureWorkspace();

const app = express();
app.use(express.json({ limit: '20mb' }));
app.use('/api', createApiRouter(WORKSPACE_ROOT));
app.use('/api', createSearchRouter(WORKSPACE_ROOT));

if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (_req, res) => res.sendFile(path.join(DIST_DIR, 'index.html')));
}

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
attachTerminalServer(wss, WORKSPACE_ROOT);

server.on('upgrade', (req, socket, head) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');
  if (pathname === '/ws/terminal') {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  } else {
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`[forge] workspace root: ${WORKSPACE_ROOT}`);
  console.log(`[forge] forge editor listening on http://localhost:${PORT}`);
});
