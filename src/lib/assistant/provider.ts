import type { FileNode } from '../../api/client';
import { analyzeCode, explainDiagnostic, suggestImprovements, type EditorMarker, type Lesson } from '../learning/engine';

export type AssistantAction = 'explain' | 'errors' | 'improve' | 'document' | 'architecture';

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  at: number;
}

export interface AssistantContext {
  path: string | null;
  code: string;
  language: string;
  markers: EditorMarker[];
  tree: FileNode[];
}

export interface AssistantProvider {
  answer(action: AssistantAction, ctx: AssistantContext): Promise<string>;
}

function formatLesson(lesson: Lesson): string {
  const points = lesson.points.map((p) => `- ${p}`).join('\n');
  return [`**${lesson.title}**`, '', lesson.summary, '', points, lesson.example ? `\n\`\`\`\n${lesson.example}\n\`\`\`` : ''].filter(Boolean).join('\n');
}

function explain(code: string, language: string): string {
  const lesson = analyzeCode(code, language);
  if (lesson) return formatLesson(lesson);
  const lines = code.split('\n').length;
  const functions = (code.match(/\bfunction\s+\w+|=>|def\s+\w+|fun\s+\w+/g) ?? []).length;
  const imports = (code.match(/\bimport\b|\brequire\s*\(/g) ?? []).length;
  return [
    '**Code walkthrough**',
    '',
    `This file has ${lines} lines, ~${functions} function definitions and ${imports} import(s), written in ${language}.`,
    '',
    '- The imports at the top pull in dependencies — read them first to see what this file builds on.',
    '- The main definitions in the middle hold the behavior; start from the exported ones.',
    '- Anything executed at the bottom (calls, mounts, listeners) is the entry point of the file.',
    '',
    'Select a specific piece of code and ask again for a focused explanation.',
  ].join('\n');
}

function document(code: string, path: string | null): string {
  const found: string[] = [];
  for (const m of code.matchAll(/\b(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g)) {
    found.push(`/**\n * ${m[1]} — TODO describe behavior.\n${(m[2] ? m[2].split(',').map((p) => p.trim()).filter(Boolean) : []).map((p) => ` * @param ${p.split(/[:=]/)[0].trim()} — TODO`).join('\n')}\n */`);
  }
  for (const m of code.matchAll(/\b(?:export\s+)?class\s+(\w+)/g)) {
    found.push(`/**\n * ${m[1]} — TODO describe responsibility.\n */`);
  }
  if (found.length === 0) return `No functions or classes found to document in **${path ?? 'this file'}**. Documentation works best on files with definitions — try asking on a component or module file.`;
  return ['Generated documentation skeletons (insert them above each definition):', '', ...found.map((f) => `\`\`\`\n${f}\n\`\`\``)].join('\n\n');
}

function architecture(tree: FileNode[]): string {
  const files: string[] = [];
  const walk = (nodes: FileNode[], prefix: string) => {
    for (const n of nodes) {
      if (n.kind === 'dir') walk(n.children ?? [], `${prefix}${n.name}/`);
      else files.push(`${prefix}${n.name}`);
    }
  };
  walk(tree, '');
  const dirs = new Set(files.map((f) => f.split('/').slice(0, -1).join('/')).filter(Boolean));
  const has = (needle: string) => [...dirs].some((d) => d.toLowerCase().includes(needle));
  const suggestions: string[] = [];
  if (!has('test')) suggestions.push('- No test folder detected — add tests/ so behavior is locked in as you learn.');
  if (!has('doc')) suggestions.push('- No documentation folder — a docs/ or Documentation/ folder captures what you learn.');
  if (!has('config')) suggestions.push('- No config folder — centralize settings instead of scattering them.');
  const byExt = new Map<string, number>();
  for (const f of files) {
    const ext = f.split('.').pop() ?? '';
    byExt.set(ext, (byExt.get(ext) ?? 0) + 1);
  }
  const langs = [...byExt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([ext, n]) => `${n}× .${ext}`).join(', ');
  return [
    '**Project architecture overview**',
    '',
    `${files.length} files across ${dirs.size} folders. Main file types: ${langs || 'none'}.`,
    '',
    'Top-level structure:',
    ...[...dirs].slice(0, 10).map((d) => `- ${d}/`),
    '',
    ...(suggestions.length ? ['Suggestions:', ...suggestions] : []),
  ].join('\n');
}

export const ruleBasedProvider: AssistantProvider = {
  async answer(action, ctx) {
    switch (action) {
      case 'explain':
        return ctx.code ? explain(ctx.code, ctx.language) : 'Open a file first, then ask me to explain it.';
      case 'errors': {
        if (ctx.markers.length === 0) return 'No problems detected in this file right now. ✅';
        return ctx.markers.slice(0, 3).map((m) => formatLesson(explainDiagnostic(m))).join('\n\n---\n\n');
      }
      case 'improve': {
        const lessons = suggestImprovements(ctx.code);
        return lessons.length ? lessons.map(formatLesson).join('\n\n---\n\n') : 'Nothing suspicious found. Clean file! ✅';
      }
      case 'document':
        return document(ctx.code, ctx.path);
      case 'architecture':
        return architecture(ctx.tree);
    }
  },
};
