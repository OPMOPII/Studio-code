# Forge Editor — Architecture

## Design principles

1. **UI and services are separated by a contract, not a boundary.** The React app talks to "capabilities" (filesystem, search, shell, memory) through a small HTTP/WS API. Today the provider is a Node/Express server; tomorrow it can be Electron IPC or Tauri commands with zero UI changes.
2. **Teach, don't just generate.** The intelligence layer is deterministic and explainable: rule-based lessons, error explainers, improvement detectors. It is honest, offline, and pluggable (`AssistantProvider` interface) so an LLM can be added as one more provider.
3. **The user controls everything.** No background agents, no autonomous actions. The assistant only answers when asked; the UI builder only inserts code when told.

## Folder structure

```
forge-editor/
├── server/src/               # Service layer (Node + Express + ws)
│   ├── index.ts              # HTTP server, static dist, WS upgrade routing
│   ├── workspace.ts          # Workspace root resolution + sample project seeding
│   ├── api.ts                # FS API: tree, read, write, create, rename, delete, memory
│   ├── search.ts             # Project-wide text search
│   └── terminal.ts           # Shell over WebSocket
├── src/                      # Client (React + TypeScript + Vite)
│   ├── api/client.ts         # Typed API client (the service contract)
│   ├── store/store.ts        # Central state (zustand): tabs, buffers, autosave, lessons, chat
│   ├── lib/
│   │   ├── monaco.ts         # Monaco setup: local workers, theme, language map
│   │   ├── learning/engine.ts# Rule-based learning engine (concepts, errors, improvements)
│   │   ├── assistant/provider.ts # AssistantProvider interface + rule-based provider
│   │   ├── graph/imports.ts  # Import parsing → dependency graph + folder clusters
│   │   ├── uibuilder/codegen.ts  # Widget model → React / Compose / HTML codegen (target registry)
│   │   ├── memory.ts         # Personal memory (debounced persistence)
│   │   └── editorBus.ts      # Insert-at-cursor channel (UI builder → editor)
│   └── components/           # ActivityBar, Explorer, SearchPanel, ProjectMap,
│                             # UIBuilderPanel, MemoryPanel, EditorArea, AssistantPanel,
│                             # BottomPanel (Terminal/Problems/Output), StatusBar
└── workspace/                # The user's actual files (seeded with a sample project)
```

## Data flow

- **Editing**: Monaco model per file (cached per tab) → `onDidChangeModelContent` → store → debounced 800 ms `PUT /api/file` (auto-save). `Ctrl/Cmd+S` saves immediately.
- **Learning Mode**: content changes (debounced) → `analyzeCode()` + `suggestImprovements()` + Monaco markers → a lesson card docks over the editor. Marker errors take priority; every lesson is recorded in personal memory.
- **Project Map**: file tree + file contents → `buildGraph()` parses `import`/`require` specifiers, resolves relative paths against the real file set → per-file connections + per-folder clusters.
- **Terminal**: xterm.js ⇄ WebSocket ⇄ child shell spawned in the workspace root.
- **Memory**: `.forge/memory.json` via `GET/PUT /api/memory`, debounced writes, cached client-side.

## Extension points

- **Plugin-ready UI**: every sidebar view is a self-contained panel registered in `App.tsx`; adding a view = one component + one entry in `ActivityBar`.
- **New codegen targets**: add an entry to the `TARGETS` registry in `src/lib/uibuilder/codegen.ts` (Flutter, SwiftUI…).
- **LLM assistant**: implement `AssistantProvider` and swap `ruleBasedProvider` in the store — the UI, actions, and memory stay unchanged.
- **Desktop shell**: implement the API contract over Electron IPC/Tauri commands; keep `src/` untouched.

## Security notes

- All filesystem paths are resolved and validated against the workspace root (`safeResolve`); traversal attempts are rejected.
- The terminal shell is spawned with `cwd` locked to the workspace root.
- Memory stays on the local machine (`.forge/memory.json`).

## Known MVP limits (planned next)

- Terminal uses piped stdio, not a PTY → no interactive TUI programs yet (node-pty is the upgrade path).
- Project map reads up to 200 files per pass.
- UI builder generates code; it does not yet render a live widget preview (the widget model is already preview-ready).
