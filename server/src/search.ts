import path from 'node:path';
import fs from 'node:fs';
import { Router, type Request, type Response } from 'express';

export interface SearchHit {
  path: string;
  line: number;
  column: number;
  text: string;
}

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.forge', '__pycache__', '.venv']);
const TEXT_EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json', '.md', '.css', '.scss', '.html', '.vue', '.svelte', '.py', '.kt', '.kts', '.java', '.rs', '.go', '.rb', '.php', '.c', '.h', '.cpp', '.hpp', '.cs', '.sh', '.yml', '.yaml', '.toml', '.xml', '.sql', '.txt']);
const MAX_HITS = 300;

function searchFiles(dir: string, root: string, query: string, caseSensitive: boolean, hits: SearchHit[]): void {
  if (hits.length >= MAX_HITS) return;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (hits.length >= MAX_HITS) return;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) searchFiles(abs, root, query, caseSensitive, hits);
      continue;
    }
    if (!TEXT_EXT.has(path.extname(entry.name).toLowerCase())) continue;
    let content: string;
    try {
      if (fs.statSync(abs).size > 500_000) continue;
      content = fs.readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    const lines = content.split('\n');
    const needle = caseSensitive ? query : query.toLowerCase();
    for (let i = 0; i < lines.length; i++) {
      const haystack = caseSensitive ? lines[i] : lines[i].toLowerCase();
      const column = haystack.indexOf(needle);
      if (column !== -1) {
        hits.push({ path: path.relative(root, abs).split(path.sep).join('/'), line: i + 1, column: column + 1, text: lines[i].slice(0, 300) });
        if (hits.length >= MAX_HITS) return;
      }
    }
  }
}

export function createSearchRouter(root: string): Router {
  const router = Router();
  router.get('/search', (req: Request, res: Response) => {
    const query = String(req.query.q ?? '');
    if (!query) return res.json({ hits: [] });
    const caseSensitive = req.query.cs === '1';
    const hits: SearchHit[] = [];
    searchFiles(root, root, query, caseSensitive, hits);
    res.json({ hits });
  });
  return router;
}
