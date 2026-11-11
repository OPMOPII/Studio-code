# Forge Editor

A personal programming studio — a code editor designed to help you **learn, create, and understand code**, not just type it.

## What it does

| Feature | What you get |
|---|---|
| **Code Editor** | Monaco-based editor with syntax highlighting, multiple tabs, auto-save (debounced, plus `Ctrl/Cmd+S`), minimap, and a custom dark theme |
| **Explorer** | Real filesystem tree of your workspace. Create, rename, delete files and folders |
| **Project Search** | Server-side full-text search across all text files, grouped by file, click a hit to jump to the line |
| **Learning Mode** | As you type, a rule-based engine detects what you are building (`Button(`, `useState`, `@Composable`, loops, async…) and teaches the concept: what it is, what's required, and a worked example. It also explains compiler errors and suggests improvements (`var` → `const`, `==` → `===`, empty catch…) |
| **Project Map** | Parses real `import`/`require` statements, builds a dependency graph, shows per-file connections (imports / imported-by) and per-folder module clusters |
| **AI Assistant Panel** | On-demand actions only — explain code, explain errors, suggest improvements, generate doc skeletons, analyze architecture. Never autonomous; every action is user-triggered |
| **UI Builder** | Drag Button/Text/Input/Image/Card/Checkbox onto a canvas and generate real code for **React**, **Jetpack Compose**, or **HTML**. Copy or insert at the editor cursor |
| **Personal Memory** | Preferences, favorite language, project notes, and a history of lessons — stored locally in `.forge/memory.json` |
| **Terminal / Output / Problems** | Real shell over WebSocket (xterm.js), an output feed for save/build events, and a problems list from Monaco diagnostics |

## Run it

```bash
npm install
npm run build      # typecheck + production bundle
npm start          # serves app + API on http://localhost:4760
```

Development mode (hot reload):

```bash
npm run dev        # API server on :4760 + Vite dev server on :5173
```

The editor operates on the `workspace/` directory (configurable with `FORGE_WORKSPACE=/path`). A sample project (`MyProject` with `Source/`, `Assets/`, `Config/`, `Documentation/`) is seeded on first run so you can explore every feature immediately.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md).

## Tech choices

- **React + TypeScript + Vite** — fast, typed, modular UI layer.
- **Monaco Editor** — the same editor core as VS Code, bundled locally (no CDN).
- **Node + Express + ws** — a thin service layer for filesystem, search, shell, and memory. The same contract maps 1:1 to Electron IPC or Tauri commands if you later want a desktop shell, so the UI never needs rewriting.
- **Rule-based intelligence, pluggable** — the learning engine and assistant are deterministic, offline, and honest about what they do. The `AssistantProvider` interface (`src/lib/assistant/provider.ts`) lets you drop in an LLM-backed provider later without touching the UI.
