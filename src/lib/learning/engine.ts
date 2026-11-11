export interface Lesson {
  id: string;
  title: string;
  kind: 'concept' | 'error' | 'improvement';
  summary: string;
  points: string[];
  example?: string;
}

export interface EditorMarker {
  severity: 'error' | 'warning' | 'info';
  message: string;
  code?: string;
  line: number;
}

interface Rule {
  id: string;
  languages?: string[];
  test: (code: string) => boolean;
  build: (code: string) => Lesson;
}

const lesson = (
  id: string,
  title: string,
  kind: Lesson['kind'],
  summary: string,
  points: string[],
  example?: string,
): Lesson => ({ id, title, kind, summary, points, example });

const RULES: Rule[] = [
  {
    id: 'button',
    languages: ['javascript', 'typescript', 'html', 'kotlin'],
    test: (c) => /\bButton\s*\(/.test(c) || /<Button/.test(c),
    build: () =>
      lesson(
        'button',
        'You are creating a Button component',
        'concept',
        'A button is an interactive component. It needs two things: what it looks like (label/content) and what happens when it is pressed (a click handler).',
        [
          'Required: an on-click callback — the function that runs when the user presses it.',
          'Required: visible content — a text label or child element.',
          'Optional but common: enabled/disabled state and styling.',
          'Keep the click handler small; delegate real work to a function with a clear name.',
        ],
        `// React\n<Button onClick={handleSave}>\n  Save changes\n</Button>\n\n// Jetpack Compose\nButton(onClick = { handleSave() }) {\n  Text("Save changes")\n}`,
      ),
  },
  {
    id: 'useState',
    languages: ['javascript', 'typescript'],
    test: (c) => /\buseState\s*[<(]/.test(c),
    build: () =>
      lesson(
        'useState',
        'You are adding state with useState',
        'concept',
        'useState gives a component memory. When the state value changes, React re-renders the component with the new value.',
        [
          'Returns a pair: the current value and a setter function.',
          'Never mutate state directly — always call the setter.',
          'Setters with a function argument (prev => ...) are safe for updates based on the previous value.',
        ],
        `const [count, setCount] = useState(0);\n\n// later\nsetCount(count + 1);        // fine\nsetCount(prev => prev + 1); // safest`,
      ),
  },
  {
    id: 'useEffect',
    languages: ['javascript', 'typescript'],
    test: (c) => /\buseEffect\s*\(/.test(c),
    build: () =>
      lesson(
        'useEffect',
        'You are synchronizing with useEffect',
        'concept',
        'useEffect runs code after render to sync your component with things outside React: network, timers, subscriptions, the DOM.',
        [
          'The dependency array decides when it re-runs: [] = once, [a, b] = when a or b changes.',
          'Return a cleanup function to undo the effect (clear timers, unsubscribe).',
          'Do not use effects for derived data — compute it during render instead.',
        ],
        `useEffect(() => {\n  const id = setInterval(tick, 1000);\n  return () => clearInterval(id);\n}, []);`,
      ),
  },
  {
    id: 'function',
    languages: ['javascript', 'typescript', 'python'],
    test: (c) => /\bfunction\s+\w+\s*\(/.test(c) || /(?:const|let)\s+\w+\s*=\s*(?:async\s*)?\(/.test(c),
    build: (code) =>
      lesson(
        'function',
        'You are defining a function',
        'concept',
        'A function bundles a reusable behavior behind a name. It takes inputs (parameters), does work, and usually returns a result.',
        [
          'Name functions as verbs describing what they do: saveUser, formatDate.',
          'One function, one job. If you need "and" to describe it, split it.',
          'Prefer returning values over mutating shared state.',
          code.length > 400 ? 'This definition is getting long — consider splitting it.' : 'Keep it small enough to understand at a glance.',
        ],
        `function formatDate(date) {\n  return date.toISOString().slice(0, 10);\n}`,
      ),
  },
  {
    id: 'async',
    languages: ['javascript', 'typescript'],
    test: (c) => /\basync\b/.test(c) || /\bawait\b/.test(c),
    build: () =>
      lesson(
        'async',
        'You are working with asynchronous code',
        'concept',
        'async/await lets you write asynchronous code that reads like synchronous code. await pauses the function until a Promise settles, without blocking the thread.',
        [
          'An async function always returns a Promise.',
          'Wrap await calls in try/catch to handle failures.',
          'Independent awaits can run together with Promise.all.',
        ],
        `async function loadUser(id) {\n  try {\n    const res = await fetch('/api/users/' + id);\n    return await res.json();\n  } catch (err) {\n    console.error('Failed to load user', err);\n    return null;\n  }\n}`,
      ),
  },
  {
    id: 'class',
    languages: ['javascript', 'typescript', 'java', 'csharp', 'python'],
    test: (c) => /\bclass\s+[A-Z]/.test(c),
    build: () =>
      lesson(
        'class',
        'You are defining a class',
        'concept',
        'A class is a blueprint for objects: it groups data (fields) with behavior (methods) that operates on that data.',
        [
          'The constructor initializes new instances.',
          'Keep fields private when possible and expose behavior, not raw data.',
          'A class with too many responsibilities is a signal to split it.',
        ],
        `class Button {\n  constructor(label, onClick) {\n    this.label = label;\n    this.onClick = onClick;\n  }\n  render() { /* ... */ }\n}`,
      ),
  },
  {
    id: 'conditionals',
    test: (c) => /\bif\s*\(/.test(c),
    build: () =>
      lesson(
        'conditionals',
        'You are writing a conditional',
        'concept',
        'An if statement chooses between paths based on a boolean condition. The condition is evaluated as true or false.',
        [
          'Prefer positive conditions; avoid double negatives.',
          'Guard clauses (early return) often read better than deep nesting.',
          'Watch out for truthiness: empty string, 0 and null are all falsy.',
        ],
        `if (!user) return; // guard clause\nif (user.age >= 18) {\n  grantAccess(user);\n}`,
      ),
  },
  {
    id: 'loops',
    test: (c) => /\bfor\s*\(|\bwhile\s*\(|\.forEach\s*\(/.test(c),
    build: () =>
      lesson(
        'loops',
        'You are writing a loop',
        'concept',
        'Loops repeat work. for loops when you know the range, while loops when you wait for a condition to change.',
        [
          'Transforming a list? map/filter are clearer than manual loops.',
          'Always make sure the condition can become false — otherwise infinite loop.',
          'Keep the loop body small; move complex work into a named function.',
        ],
        `for (const file of files) {\n  console.log(file.name);\n}`,
      ),
  },
  {
    id: 'imports',
    test: (c) => /\bimport\s.+from\s+['"]/.test(c) || /\brequire\s*\(/.test(c),
    build: () =>
      lesson(
        'imports',
        'You are importing a module',
        'concept',
        'Imports pull code from another file or package into this one. Relative paths (./utils) are your files; bare names (react) are packages.',
        [
          'Named imports pick specific exports: import { Button } from ...',
          'Default imports take the single main export: import App from ...',
          'Keep import lists sorted and minimal — unused imports are noise.',
        ],
        `import { Button } from './components/Button.js';\nimport React from 'react';`,
      ),
  },
  {
    id: 'variables',
    test: (c) => /\bconst\s|\blet\s|\bvar\s/.test(c),
    build: (code) =>
      lesson(
        'variables',
        /\bvar\s/.test(code) ? 'You are using var — prefer const or let' : 'You are declaring variables',
        /\bvar\s/.test(code) ? 'improvement' : 'concept',
        'Variables name values. const means the binding cannot be reassigned; let means it can.',
        [
          'Default to const; switch to let only when reassignment is needed.',
          'var is function-scoped and hoisted — a common source of bugs.',
          'Give variables noun names for data, and avoid single letters except in tiny loops.',
        ],
        `const maxRetries = 3;\nlet attempts = 0;`,
      ),
  },
  {
    id: 'compose',
    languages: ['kotlin'],
    test: (c) => /@Composable/.test(c) || /\bColumn\s*\(|\bRow\s*\(|\bText\s*\(\s*"/.test(c),
    build: () =>
      lesson(
        'compose',
        'You are building Jetpack Compose UI',
        'concept',
        'Compose builds UI by calling composable functions. Each function describes UI for a given state, and Compose re-runs them when state changes (recomposition).',
        [
          'Composables are functions, not classes — keep them small and stateless when possible.',
          'State that should trigger recomposition goes through remember { mutableStateOf(...) }.',
          'Layout is nested: Column, Row, Box wrap other composables.',
        ],
        `@Composable\nfun Greeting(name: String) {\n  Column {\n    Text("Hello, $name")\n    Button(onClick = { /* TODO */ }) {\n      Text("Greet")\n    }\n  }\n}`,
      ),
  },
  {
    id: 'entrypoint',
    test: (c) => /\bfun\s+main\s*\(/.test(c) || /\bdef\s+main\s*\(/.test(c) || /\bmain\s*\(\s*\)\s*{/.test(c),
    build: () =>
      lesson(
        'entrypoint',
        'You are writing the program entry point',
        'concept',
        'The main function is where execution starts. Everything else is reached from here through function calls and imports.',
        [
          'Keep main thin: parse input, call the core logic, handle the result.',
          'Core logic that lives outside main is easier to test.',
        ],
        `fun main() {\n  val app = App()\n  app.run()\n}`,
      ),
  },
  {
    id: 'errorHandling',
    test: (c) => /\btry\s*{/.test(c) || /\bexcept\b|\bcatch\s*\(/.test(c),
    build: () =>
      lesson(
        'errorHandling',
        'You are handling errors',
        'concept',
        'try/catch separates the happy path from failure handling. Catch only what you can actually handle at this level.',
        [
          'Never leave a catch block empty — silent failures are the hardest bugs.',
          'Catch specific errors when you can; log or rethrow the rest.',
          'In async code, unhandled promise rejections crash silently — always await inside try.',
        ],
        `try {\n  save(data);\n} catch (err) {\n  console.error('Save failed:', err);\n  throw err;\n}`,
      ),
  },
  {
    id: 'map',
    languages: ['javascript', 'typescript'],
    test: (c) => /\.map\s*\(/.test(c) || /\.filter\s*\(/.test(c),
    build: () =>
      lesson(
        'collections',
        'You are transforming a collection',
        'concept',
        'map transforms each element, filter keeps the ones that pass a test, reduce folds everything into one value. They return new arrays and never mutate the source.',
        [
          'Chain them in the order you think: filter first (smaller list), then map.',
          'These take a function — usually a small arrow function.',
        ],
        `const names = users\n  .filter(u => u.active)\n  .map(u => u.name);`,
      ),
  },
];

export function analyzeCode(code: string, language: string): Lesson | null {
  for (const rule of RULES) {
    if (rule.languages && !rule.languages.includes(language)) continue;
    if (rule.test(code)) return rule.build(code);
  }
  return null;
}

export function suggestImprovements(code: string): Lesson[] {
  const out: Lesson[] = [];
  if (/\bvar\s+\w/.test(code)) {
    out.push(lesson('imp-var', 'Replace var with const or let', 'improvement', 'var is function-scoped and hoisted, which causes subtle bugs. const/let are block-scoped and predictable.', ['Use const by default.', 'Use let only when the variable is reassigned.']));
  }
  if (/[^=!<>]==[^=]/.test(code)) {
    out.push(lesson('imp-eq', 'Use strict equality (===)', 'improvement', '== converts types before comparing, so "" == 0 is true. === compares value and type.', ['Use === and !== everywhere.', 'Only rely on == for null/undefined checks if the team agrees on it.']));
  }
  if (/catch\s*\([^)]*\)\s*{\s*}/.test(code)) {
    out.push(lesson('imp-empty-catch', 'Empty catch block detected', 'improvement', 'Swallowing errors silently hides real problems. At minimum, log the error or rethrow it.', ['Log with context about what was being attempted.', 'Rethrow if the caller should decide what to do.']));
  }
  const logs = (code.match(/console\.log\s*\(/g) ?? []).length;
  if (logs > 3) {
    out.push(lesson('imp-logs', `${logs} console.log calls in this file`, 'improvement', 'Leftover debug logging adds noise in production. Consider a logger you can switch off.', ['Remove or gate logs behind a DEBUG flag.', 'Prefer structured logging over string concatenation.']));
  }
  const lines = code.split('\n');
  let fnStart = -1;
  lines.forEach((line, i) => {
    if (/\bfunction\s+\w+\s*\(|(?:const|let)\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*{/.test(line)) fnStart = i;
    if (fnStart >= 0 && i - fnStart > 45) {
      out.push(lesson('imp-long-fn', 'Very long function detected', 'improvement', 'Functions over ~45 lines are hard to test and review. Split by responsibility.', ['Extract steps into named helper functions.', 'A good function fits on one screen.']));
      fnStart = -1;
    }
  });
  return out;
}

const ERROR_DOCS: { match: RegExp; build: (m: RegExpMatchArray, message: string) => Lesson }[] = [
  {
    match: /TS2304|is not defined/,
    build: (_m, message) =>
      lesson('err-undefined', 'A name is not defined', 'error', `The compiler hit "${message}" — you used a name that does not exist in this scope.`, [
        'Check the spelling — names are case-sensitive.',
        'If it comes from another file, add or fix the import.',
        'If it should exist, declare it before it is used.',
      ]),
  },
  {
    match: /TS2307|Cannot find module/,
    build: (_m, message) =>
      lesson('err-module', 'Module not found', 'error', `"${message}" — the import path cannot be resolved.`, [
        'Verify the path is correct and case matches the real file name.',
        'Relative imports start with ./ or ../; package imports use the package name.',
        'Check that the package is installed (package.json / node_modules).',
      ]),
  },
  {
    match: /TS7006|implicitly has an 'any'/,
    build: (_m, message) =>
      lesson('err-implicit-any', 'Implicit any type', 'error', `"${message}" — TypeScript cannot tell what type this value is.`, [
        'Add an explicit type annotation.',
        'Or type the function parameters so inference can flow.',
      ]),
  },
  {
    match: /is not a function/,
    build: (_m, message) =>
      lesson('err-not-fn', 'Calling something that is not a function', 'error', `"${message}" — the value you called does not exist or is not a function.`, [
        'Log or inspect the value right before the call.',
        'Check the import: a default import vs named import mix-up returns undefined.',
        'Check for typos in the property name.',
      ]),
  },
  {
    match: /Unexpected token|SyntaxError/,
    build: (_m, message) =>
      lesson('err-syntax', 'Syntax error', 'error', `"${message}" — the parser found something it cannot understand.`, [
        'Look at the reported line and the line above it — often a missing bracket, comma or quote.',
        'Check that all brackets and braces are balanced.',
      ]),
  },
];

export function explainDiagnostic(marker: EditorMarker): Lesson {
  for (const doc of ERROR_DOCS) {
    const m = (marker.code ? `${marker.code} ${marker.message}` : marker.message).match(doc.match);
    if (m) return doc.build(m, marker.message);
  }
  return lesson(
    'err-generic',
    `Problem on line ${marker.line}`,
    'error',
    `The analyzer reports: "${marker.message}"`,
    [
      'Read the message from the inside out: what value, what expectation failed.',
      'Jump to the line and inspect the surrounding context.',
      'If the message mentions a type, print or hover the value to see its real type.',
    ],
  );
}
