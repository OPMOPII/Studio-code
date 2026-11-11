import { api, type MemoryData } from '../api/client';

const EMPTY: MemoryData = { preferences: {}, notes: '', explanations: [] };

let cache: MemoryData | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export async function loadMemory(): Promise<MemoryData> {
  if (cache) return cache;
  try {
    const data = await api.getMemory();
    cache = { ...EMPTY, ...data, preferences: { ...EMPTY.preferences, ...data.preferences } };
  } catch {
    cache = { ...EMPTY };
  }
  return cache;
}

export function updateMemory(mutate: (data: MemoryData) => void): MemoryData {
  if (!cache) cache = { ...EMPTY };
  mutate(cache);
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void api.saveMemory(cache!).catch(() => undefined);
  }, 600);
  return cache;
}

export function getMemorySnapshot(): MemoryData {
  return cache ?? { ...EMPTY };
}
