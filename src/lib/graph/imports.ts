import type { FileNode } from '../../api/client';

export interface GraphNode {
  path: string;
  name: string;
  dir: string;
  imports: string[];
  importedBy: string[];
}

const SPEC_RE = /(?:import|export)[\s\S]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function collectFiles(nodes: FileNode[], out: FileNode[] = []): FileNode[] {
  for (const node of nodes) {
    if (node.kind === 'dir') collectFiles(node.children ?? [], out);
    else out.push(node);
  }
  return out;
}

function parseSpecifiers(code: string): string[] {
  const specs: string[] = [];
  for (const m of code.matchAll(SPEC_RE)) {
    const spec = m[1] ?? m[2] ?? m[3] ?? '';
    if (spec) specs.push(spec);
  }
  return specs;
}

function resolveRelative(fromPath: string, spec: string): string {
  const parts = fromPath.split('/').slice(0, -1).concat(spec.split('/'));
  const out: string[] = [];
  for (const part of parts) {
    if (part === '.' || part === '') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return out.join('/');
}

function resolveSpecifier(spec: string, fromPath: string, fileSet: Set<string>): string | null {
  if (!spec.startsWith('.')) return null;
  const base = resolveRelative(fromPath, spec);
  const candidates = [base, ...['.ts', '.tsx', '.js', '.jsx', '.mjs', '.kt', '.py', '.css', '.json'].map((ext) => base + ext), ...['/index.ts', '/index.tsx', '/index.js', '/index.kt'].map((suf) => base + suf)];
  for (const candidate of candidates) {
    if (fileSet.has(candidate)) return candidate;
  }
  return null;
}

export function buildGraph(files: FileNode[], readContent: (path: string) => string | undefined): Map<string, GraphNode> {
  const fileSet = new Set(files.map((f) => f.path));
  const graph = new Map<string, GraphNode>();
  for (const file of files) {
    graph.set(file.path, { path: file.path, name: file.name, dir: file.path.split('/').slice(0, -1).join('/'), imports: [], importedBy: [] });
  }
  for (const file of files) {
    const code = readContent(file.path);
    if (code === undefined) continue;
    for (const spec of parseSpecifiers(code)) {
      const resolved = resolveSpecifier(spec, file.path, fileSet);
      if (!resolved || resolved === file.path) continue;
      graph.get(file.path)?.imports.push(resolved);
      graph.get(resolved)?.importedBy.push(file.path);
    }
  }
  return graph;
}

export function flattenFiles(tree: FileNode[]): FileNode[] {
  return collectFiles(tree);
}

export interface DirCluster {
  dir: string;
  files: GraphNode[];
  internalDeps: number;
  externalDeps: number;
}

export function clusterByDirectory(graph: Map<string, GraphNode>): DirCluster[] {
  const clusters = new Map<string, DirCluster>();
  for (const node of graph.values()) {
    const key = node.dir || '(root)';
    if (!clusters.has(key)) clusters.set(key, { dir: key, files: [], internalDeps: 0, externalDeps: 0 });
    const cluster = clusters.get(key)!;
    cluster.files.push(node);
    for (const target of node.imports) {
      const targetDir = graph.get(target)?.dir || '(root)';
      if (targetDir === key) cluster.internalDeps += 1;
      else cluster.externalDeps += 1;
    }
  }
  return [...clusters.values()].sort((a, b) => a.dir.localeCompare(b.dir));
}
