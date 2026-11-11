import path from 'node:path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { Router, type Request, type Response } from 'express';

export interface TreeNode {
  name: string;
  path: string;
  kind: 'file' | 'dir';
  children?: TreeNode[];
}

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.forge', '__pycache__', '.venv']);
const BINARY_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.zip', '.gz', '.pdf']);

export function safeResolve(root: string, relative: string): string {
  const target = path.resolve(root, relative);
  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new Error('Path escapes workspace root');
  }
  return target;
}

function walk(dir: string, root: string, depth = 0): TreeNode[] {
  if (depth > 12) return [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const nodes: TreeNode[] = [];
  for (const entry of entries.sort((a, b) => (a.isDirectory() === b.isDirectory() ? a.name.localeCompare(b.name) : a.isDirectory() ? -1 : 1))) {
    if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    const rel = path.relative(root, abs).split(path.sep).join('/');
    if (entry.isDirectory()) {
      nodes.push({ name: entry.name, path: rel, kind: 'dir', children: walk(abs, root, depth + 1) });
    } else {
      nodes.push({ name: entry.name, path: rel, kind: 'file' });
    }
  }
  return nodes;
}

export function createApiRouter(root: string): Router {
  const router = Router();

  router.get('/tree', (_req: Request, res: Response) => {
    res.json({ root: path.basename(root), tree: walk(root, root) });
  });

  router.get('/file', (req: Request, res: Response) => {
    try {
      const abs = safeResolve(root, String(req.query.path ?? ''));
      const stat = fs.statSync(abs);
      if (stat.isDirectory()) return res.status(400).json({ error: 'Path is a directory' });
      if (BINARY_EXT.has(path.extname(abs).toLowerCase())) return res.status(415).json({ error: 'Binary file' });
      if (stat.size > 2_000_000) return res.status(413).json({ error: 'File too large' });
      res.json({ path: String(req.query.path), content: fs.readFileSync(abs, 'utf8') });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  router.put('/file', async (req: Request, res: Response) => {
    try {
      const { path: rel, content } = req.body as { path: string; content: string };
      const abs = safeResolve(root, rel);
      await fsp.mkdir(path.dirname(abs), { recursive: true });
      await fsp.writeFile(abs, content, 'utf8');
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  router.post('/file', async (req: Request, res: Response) => {
    try {
      const { path: rel, kind } = req.body as { path: string; kind: 'file' | 'dir' };
      const abs = safeResolve(root, rel);
      if (fs.existsSync(abs)) return res.status(409).json({ error: 'Already exists' });
      if (kind === 'dir') await fsp.mkdir(abs, { recursive: true });
      else {
        await fsp.mkdir(path.dirname(abs), { recursive: true });
        await fsp.writeFile(abs, '', 'utf8');
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  router.patch('/file', async (req: Request, res: Response) => {
    try {
      const { path: rel, newPath } = req.body as { path: string; newPath: string };
      const abs = safeResolve(root, rel);
      const absNew = safeResolve(root, newPath);
      await fsp.mkdir(path.dirname(absNew), { recursive: true });
      await fsp.rename(abs, absNew);
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  router.delete('/file', async (req: Request, res: Response) => {
    try {
      const abs = safeResolve(root, String(req.query.path ?? ''));
      if (abs === root) return res.status(400).json({ error: 'Cannot delete workspace root' });
      await fsp.rm(abs, { recursive: true });
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  router.get('/memory', (_req: Request, res: Response) => {
    const file = path.join(root, '.forge', 'memory.json');
    try {
      res.json(JSON.parse(fs.readFileSync(file, 'utf8')));
    } catch {
      res.json({ preferences: {}, notes: '', explanations: [] });
    }
  });

  router.put('/memory', (req: Request, res: Response) => {
    try {
      const file = path.join(root, '.forge', 'memory.json');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(req.body ?? {}, null, 2));
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  return router;
}
