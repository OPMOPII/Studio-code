export interface FileNode {
  name: string;
  path: string;
  kind: 'file' | 'dir';
  children?: FileNode[];
}

export interface SearchHit {
  path: string;
  line: number;
  column: number;
  text: string;
}

export interface MemoryData {
  preferences: { language?: string; learningMode?: boolean; autoSave?: boolean };
  notes: string;
  explanations: { at: number; title: string }[];
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? res.statusText);
  return body as T;
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const api = {
  tree: () => request<{ root: string; tree: FileNode[] }>('/api/tree'),
  readFile: (path: string) => request<{ path: string; content: string }>(`/api/file?path=${encodeURIComponent(path)}`),
  writeFile: (path: string, content: string) => request<{ ok: boolean }>('/api/file', json('PUT', { path, content })),
  createEntry: (path: string, kind: 'file' | 'dir') => request<{ ok: boolean }>('/api/file', json('POST', { path, kind })),
  renameEntry: (path: string, newPath: string) => request<{ ok: boolean }>('/api/file', json('PATCH', { path, newPath })),
  deleteEntry: (path: string) => request<{ ok: boolean }>(`/api/file?path=${encodeURIComponent(path)}`, { method: 'DELETE' }),
  search: (q: string, cs: boolean) => request<{ hits: SearchHit[] }>(`/api/search?q=${encodeURIComponent(q)}&cs=${cs ? '1' : '0'}`),
  getMemory: () => request<MemoryData>('/api/memory'),
  saveMemory: (data: MemoryData) => request<{ ok: boolean }>('/api/memory', json('PUT', data)),
};
