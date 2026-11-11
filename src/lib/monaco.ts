import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';

self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    if (label === 'typescript' || label === 'javascript') return new tsWorker();
    if (label === 'json') return new jsonWorker();
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker();
    if (label === 'html') return new htmlWorker();
    return new editorWorker();
  },
};

const LANG_BY_EXT: Record<string, string> = {
  js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'javascript',
  ts: 'typescript', tsx: 'typescript',
  json: 'json', css: 'css', scss: 'scss', less: 'less',
  html: 'html', htm: 'html', vue: 'html', svelte: 'html', xml: 'xml', svg: 'xml',
  md: 'markdown', py: 'python', kt: 'kotlin', kts: 'kotlin', java: 'java',
  rs: 'rust', go: 'go', rb: 'ruby', php: 'php', c: 'c', h: 'c',
  cpp: 'cpp', hpp: 'cpp', cs: 'csharp', sh: 'shell', bash: 'shell',
  yml: 'yaml', yaml: 'yaml', toml: 'ini', ini: 'ini', sql: 'sql', txt: 'plaintext',
};

export function languageFor(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  return LANG_BY_EXT[ext] ?? 'plaintext';
}

monaco.editor.defineTheme('forge-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '5b6478', fontStyle: 'italic' },
    { token: 'keyword', foreground: '7c9cff' },
    { token: 'string', foreground: '8fd6a5' },
    { token: 'number', foreground: 'e8b46a' },
    { token: 'type', foreground: '6fd3e0' },
    { token: 'function', foreground: 'c792ea' },
  ],
  colors: {
    'editor.background': '#0d1117',
    'editor.foreground': '#d7dde8',
    'editorLineNumber.foreground': '#3a4356',
    'editorLineNumber.activeForeground': '#7c9cff',
    'editor.selectionBackground': '#24406e88',
    'editor.lineHighlightBackground': '#141b26',
    'editorCursor.foreground': '#7c9cff',
    'editorIndentGuide.background1': '#1c2431',
    'editorGutter.background': '#0d1117',
  },
});

export { monaco };
