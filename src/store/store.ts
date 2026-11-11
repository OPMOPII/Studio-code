import { create } from 'zustand';
import { api, type FileNode, type SearchHit, type MemoryData } from '../api/client';
import { languageFor } from '../lib/monaco';
import { analyzeCode, suggestImprovements, type EditorMarker, type Lesson } from '../lib/learning/engine';
import { loadMemory, updateMemory, getMemorySnapshot } from '../lib/memory';
import { ruleBasedProvider, type AssistantAction, type AssistantMessage } from '../lib/assistant/provider';

export type SidebarView = 'explorer' | 'search' | 'map' | 'uibuilder' | 'memory';
export type BottomView = 'terminal' | 'problems' | 'output';

export interface Tab {
  path: string;
  language: string;
}

const AUTOSAVE_DELAY = 800;
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

interface ForgeState {
  rootName: string;
  tree: FileNode[];
  expanded: Set<string>;
  tabs: Tab[];
  activePath: string | null;
  contents: Record<string, string>;
  savedContents: Record<string, string>;
  sidebarView: SidebarView;
  sidebarOpen: boolean;
  assistantOpen: boolean;
  bottomOpen: boolean;
  bottomView: BottomView;
  learningOpen: boolean;
  learningLesson: Lesson | null;
  searchQuery: string;
  searchCaseSensitive: boolean;
  searchHits: SearchHit[];
  markers: Record<string, EditorMarker[]>;
  assistantMessages: AssistantMessage[];
  assistantBusy: boolean;
  memory: MemoryData;
  outputLines: string[];
  statusMessage: string;

  bootstrap: () => Promise<void>;
  refreshTree: () => Promise<void>;
  toggleDir: (path: string) => void;
  openFile: (path: string) => Promise<void>;
  closeTab: (path: string) => void;
  setActive: (path: string) => void;
  setContent: (path: string, content: string) => void;
  saveNow: (path?: string) => Promise<void>;
  createEntry: (parentDir: string, name: string, kind: 'file' | 'dir') => Promise<void>;
  renameEntry: (path: string, newName: string) => Promise<void>;
  deleteEntry: (path: string) => Promise<void>;
  runSearch: (query: string, caseSensitive: boolean) => Promise<void>;
  setSidebarView: (view: SidebarView) => void;
  toggleSidebar: () => void;
  toggleAssistant: () => void;
  toggleBottom: (view?: BottomView) => void;
  setBottomView: (view: BottomView) => void;
  setLearningLesson: (lesson: Lesson | null) => void;
  setMarkers: (path: string, markers: EditorMarker[]) => void;
  refreshLessons: () => void;
  askAssistant: (action: AssistantAction) => Promise<void>;
  saveMemoryData: () => void;
  setPreference: (key: 'language' | 'learningMode' | 'autoSave', value: boolean | string) => void;
  setNotes: (notes: string) => void;
  pushOutput: (line: string) => void;
  openSearchHit: (path: string, line: number) => Promise<void>;
  pendingReveal: { path: string; line: number } | null;
  clearReveal: () => void;
}

function allFiles(nodes: FileNode[], out: FileNode[] = []): FileNode[] {
  for (const n of nodes) {
    if (n.kind === 'dir') allFiles(n.children ?? [], out);
    else out.push(n);
  }
  return out;
}

export const useForge = create<ForgeState>((set, get) => ({
  rootName: '',
  tree: [],
  expanded: new Set(),
  tabs: [],
  activePath: null,
  contents: {},
  savedContents: {},
  sidebarView: 'explorer',
  sidebarOpen: true,
  assistantOpen: true,
  bottomOpen: false,
  bottomView: 'terminal',
  learningOpen: true,
  learningLesson: null,
  searchQuery: '',
  searchCaseSensitive: false,
  searchHits: [],
  markers: {},
  assistantMessages: [],
  assistantBusy: false,
  memory: { preferences: {}, notes: '', explanations: [] },
  pendingReveal: null,
  outputLines: ['[forge] workspace ready — output, build and save events appear here.'],
  statusMessage: '',

  bootstrap: async () => {
    await loadMemory();
    const { root, tree } = await api.tree();
    const expanded = new Set<string>();
    for (const node of tree) if (node.kind === 'dir') expanded.add(node.path);
    set({ memory: getMemorySnapshot(), rootName: root, tree, expanded });
    const first = allFiles(tree).find((f) => /\.(js|ts|tsx|jsx|kt|py|md)$/.test(f.name));
    if (first) await get().openFile(first.path);
  },

  refreshTree: async () => {
    const { root, tree } = await api.tree();
    set({ rootName: root, tree });
  },

  toggleDir: (path) => {
    const expanded = new Set(get().expanded);
    if (expanded.has(path)) expanded.delete(path);
    else expanded.add(path);
    set({ expanded });
  },

  openFile: async (path) => {
    const { tabs, contents } = get();
    if (!tabs.some((t) => t.path === path)) {
      if (contents[path] === undefined) {
        try {
          const { content } = await api.readFile(path);
          set({ contents: { ...get().contents, [path]: content }, savedContents: { ...get().savedContents, [path]: content } });
        } catch (err) {
          get().pushOutput(`[forge] could not open ${path}: ${(err as Error).message}`);
          return;
        }
      }
      set({ tabs: [...tabs, { path, language: languageFor(path) }] });
    }
    set({ activePath: path });
    get().refreshLessons();
  },

  closeTab: (path) => {
    const { tabs, activePath } = get();
    const idx = tabs.findIndex((t) => t.path === path);
    const next = tabs.filter((t) => t.path !== path);
    const contents = { ...get().contents };
    const saved = { ...get().savedContents };
    const markers = { ...get().markers };
    delete contents[path];
    delete saved[path];
    delete markers[path];
    set({
      tabs: next,
      contents,
      savedContents: saved,
      markers,
      activePath: activePath === path ? (next[Math.max(0, idx - 1)]?.path ?? null) : activePath,
    });
    if (activePath === path) get().refreshLessons();
  },

  setActive: (path) => {
    set({ activePath: path });
    get().refreshLessons();
  },

  setContent: (path, content) => {
    set({ contents: { ...get().contents, [path]: content } });
    const existing = saveTimers.get(path);
    if (existing) clearTimeout(existing);
    saveTimers.set(
      path,
      setTimeout(() => {
        void get().saveNow(path);
      }, AUTOSAVE_DELAY),
    );
  },

  saveNow: async (path) => {
    const target = path ?? get().activePath;
    if (!target) return;
    const content = get().contents[target];
    if (content === undefined) return;
    try {
      await api.writeFile(target, content);
      set({ savedContents: { ...get().savedContents, [target]: content }, statusMessage: `Auto-saved ${target}` });
      get().pushOutput(`[save] ${target}`);
    } catch (err) {
      set({ statusMessage: `Save failed: ${(err as Error).message}` });
      get().pushOutput(`[error] save failed for ${target}: ${(err as Error).message}`);
    }
  },

  createEntry: async (parentDir, name, kind) => {
    const rel = parentDir ? `${parentDir}/${name}` : name;
    try {
      await api.createEntry(rel, kind);
      await get().refreshTree();
      if (kind === 'file') await get().openFile(rel);
      get().pushOutput(`[fs] created ${kind} ${rel}`);
    } catch (err) {
      set({ statusMessage: (err as Error).message });
    }
  },

  renameEntry: async (path, newName) => {
    const parent = path.split('/').slice(0, -1).join('/');
    const newPath = parent ? `${parent}/${newName}` : newName;
    try {
      await api.renameEntry(path, newPath);
      const { tabs, contents, savedContents } = get();
      const remap = (obj: Record<string, string>) => {
        const next: Record<string, string> = {};
        for (const [k, v] of Object.entries(obj)) next[k === path ? newPath : k] = v;
        return next;
      };
      set({
        tabs: tabs.map((t) => (t.path === path ? { ...t, path: newPath, language: languageFor(newPath) } : t)),
        contents: remap(contents),
        savedContents: remap(savedContents),
        activePath: get().activePath === path ? newPath : get().activePath,
      });
      await get().refreshTree();
    } catch (err) {
      set({ statusMessage: (err as Error).message });
    }
  },

  deleteEntry: async (path) => {
    try {
      await api.deleteEntry(path);
      const { tabs } = get();
      for (const tab of tabs) if (tab.path === path || tab.path.startsWith(path + '/')) get().closeTab(tab.path);
      await get().refreshTree();
      get().pushOutput(`[fs] deleted ${path}`);
    } catch (err) {
      set({ statusMessage: (err as Error).message });
    }
  },

  runSearch: async (query, caseSensitive) => {
    set({ searchQuery: query, searchCaseSensitive: caseSensitive });
    if (!query.trim()) {
      set({ searchHits: [] });
      return;
    }
    try {
      const { hits } = await api.search(query, caseSensitive);
      set({ searchHits: hits });
    } catch (err) {
      set({ statusMessage: `Search failed: ${(err as Error).message}` });
    }
  },

  openSearchHit: async (path, line) => {
    await get().openFile(path);
    set({ pendingReveal: { path, line } });
  },

  clearReveal: () => set({ pendingReveal: null }),

  setSidebarView: (view) => set({ sidebarView: view, sidebarOpen: true }),
  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
  toggleAssistant: () => set({ assistantOpen: !get().assistantOpen }),
  toggleBottom: (view) => {
    const { bottomOpen, bottomView } = get();
    if (view && (!bottomOpen || view !== bottomView)) set({ bottomOpen: true, bottomView: view });
    else set({ bottomOpen: !bottomOpen });
  },
  setBottomView: (view) => set({ bottomView: view, bottomOpen: true }),

  setLearningLesson: (lesson) => set({ learningLesson: lesson, learningOpen: lesson !== null }),

  setMarkers: (path, markers) => {
    set({ markers: { ...get().markers, [path]: markers } });
    if (get().activePath === path) get().refreshLessons();
  },

  refreshLessons: () => {
    const { activePath, contents, markers, learningLesson } = get();
    if (!activePath) return;
    const code = contents[activePath] ?? '';
    const lesson = analyzeCode(code, languageFor(activePath));
    const improvements = suggestImprovements(code);
    const fileMarkers = markers[activePath] ?? [];
    const chosen = fileMarkers.some((m) => m.severity === 'error')
      ? learningLesson
      : (lesson ?? improvements[0] ?? learningLesson);
    if (chosen && chosen.id !== learningLesson?.id) {
      set({ learningLesson: chosen });
      updateMemory((data) => {
        if (!data.explanations.some((e) => e.title === chosen.title)) {
          data.explanations = [{ at: Date.now(), title: chosen.title }, ...data.explanations].slice(0, 30);
        }
      });
    }
  },

  askAssistant: async (action) => {
    const { activePath, contents, markers, tree } = get();
    const label: Record<AssistantAction, string> = {
      explain: 'Explain this code',
      errors: 'Explain the errors',
      improve: 'Suggest improvements',
      document: 'Generate documentation',
      architecture: 'Analyze project architecture',
    };
    const userMsg: AssistantMessage = { id: `u${Date.now()}`, role: 'user', text: label[action], at: Date.now() };
    set({ assistantMessages: [...get().assistantMessages, userMsg], assistantBusy: true });
    try {
      const text = await ruleBasedProvider.answer(action, {
        path: activePath,
        code: activePath ? (contents[activePath] ?? '') : '',
        language: activePath ? languageFor(activePath) : 'plaintext',
        markers: activePath ? (markers[activePath] ?? []) : [],
        tree,
      });
      const botMsg: AssistantMessage = { id: `a${Date.now()}`, role: 'assistant', text, at: Date.now() };
      set({ assistantMessages: [...get().assistantMessages, botMsg] });
      updateMemory((data) => {
        data.explanations = [{ at: Date.now(), title: label[action] }, ...data.explanations].slice(0, 30);
      });
      set({ memory: getMemorySnapshot() });
    } catch (err) {
      set({
        assistantMessages: [
          ...get().assistantMessages,
          { id: `a${Date.now()}`, role: 'assistant', text: `Assistant failed: ${(err as Error).message}`, at: Date.now() },
        ],
      });
    } finally {
      set({ assistantBusy: false });
    }
  },

  saveMemoryData: () => {
    updateMemory(() => undefined);
    set({ memory: getMemorySnapshot() });
  },

  setPreference: (key, value) => {
    updateMemory((data) => {
      (data.preferences as Record<string, unknown>)[key] = value;
    });
    set({ memory: getMemorySnapshot() });
  },

  setNotes: (notes) => {
    updateMemory((data) => {
      data.notes = notes;
    });
    set({ memory: getMemorySnapshot() });
  },

  pushOutput: (line) => {
    const lines = [...get().outputLines, line];
    set({ outputLines: lines.slice(-300) });
  },
}));
