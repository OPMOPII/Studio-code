import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const WORKSPACE_ROOT = path.resolve(
  process.env.FORGE_WORKSPACE ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'workspace'),
);

const SAMPLE_FILES: Record<string, string> = {
  'MyProject/Source/main.js': `import { App } from './components/App.js';

const app = new App('#root');
app.mount();
`,
  'MyProject/Source/components/App.js': `import { Button } from './Button.js';

export class App {
  constructor(selector) {
    this.container = document.querySelector(selector);
  }

  mount() {
    const button = new Button('Hello Forge', () => {
      console.log('Button clicked!');
    });
    this.container.appendChild(button.render());
  }
}
`,
  'MyProject/Source/components/Button.js': `export class Button {
  constructor(label, onClick) {
    this.label = label;
    this.onClick = onClick;
  }

  render() {
    const element = document.createElement('button');
    element.textContent = this.label;
    element.addEventListener('click', this.onClick);
    return element;
  }
}
`,
  'MyProject/Source/utils/format.js': `export function formatDate(date) {
  return date.toISOString().slice(0, 10);
}
`,
  'MyProject/Config/settings.json': `{
  "theme": "forge-dark",
  "editor": { "fontSize": 14, "tabSize": 2, "autoSave": true }
}
`,
  'MyProject/Documentation/README.md': `# MyProject

A sample project seeded by Forge Editor.

## Structure
- Source — application code
- Assets — static resources
- Config — configuration files
- Documentation — docs and notes
`,
  'MyProject/Documentation/architecture.md': `# Architecture Notes

App mounts into #root and composes UI from components in Source/components.
`,
};

export function ensureWorkspace(): void {
  fs.mkdirSync(WORKSPACE_ROOT, { recursive: true });
  for (const dir of ['MyProject/Source/components', 'MyProject/Source/utils', 'MyProject/Assets', 'MyProject/Config', 'MyProject/Documentation', '.forge']) {
    fs.mkdirSync(path.join(WORKSPACE_ROOT, dir), { recursive: true });
  }
  for (const [rel, content] of Object.entries(SAMPLE_FILES)) {
    const target = path.join(WORKSPACE_ROOT, rel);
    if (!fs.existsSync(target)) fs.writeFileSync(target, content);
  }
}
