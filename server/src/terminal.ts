import { spawn, type ChildProcess } from 'node:child_process';
import type { WebSocket, WebSocketServer } from 'ws';

interface TerminalSession {
  proc: ChildProcess;
}

export function attachTerminalServer(wss: WebSocketServer, cwd: string): void {
  wss.on('connection', (ws: WebSocket, _req: import('node:http').IncomingMessage) => {
    const shell = process.env.SHELL && process.env.SHELL !== '/bin/false' ? process.env.SHELL : '/bin/bash';
    const proc = spawn(shell, ['-i'], {
      cwd,
      env: { ...process.env, TERM: 'dumb', FORGE_EDITOR: '1' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const session: TerminalSession = { proc };
    (ws as unknown as { _session?: TerminalSession })._session = session;

    const send = (data: string) => {
      if (ws.readyState === ws.OPEN) ws.send(data);
    };
    proc.stdout?.on('data', (chunk: Buffer) => send(chunk.toString('utf8')));
    proc.stderr?.on('data', (chunk: Buffer) => send(chunk.toString('utf8')));
    proc.on('exit', (code) => {
      send(`\r\n\x1b[90m[forge] shell exited with code ${code ?? 0}\x1b[0m\r\n`);
      ws.close();
    });

    send(`\x1b[90m[forge] terminal ready — cwd: ${cwd}\x1b[0m\r\n`);

    ws.on('message', (data: Buffer) => {
      const raw = data.toString('utf8');
      try {
        const msg = JSON.parse(raw) as { type: string; data?: string; cols?: number; rows?: number };
        if (msg.type === 'input' && typeof msg.data === 'string') proc.stdin?.write(msg.data);
      } catch {
        proc.stdin?.write(raw);
      }
    });

    ws.on('close', () => {
      proc.kill();
    });
    ws.on('error', () => proc.kill());
  });
}
