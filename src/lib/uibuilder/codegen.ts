export type WidgetKind = 'button' | 'text' | 'input' | 'image' | 'card' | 'checkbox';

export interface Widget {
  id: string;
  kind: WidgetKind;
  label: string;
}

export type TargetId = 'react' | 'compose' | 'html';

export interface CodeTarget {
  id: TargetId;
  name: string;
  generate: (widgets: Widget[]) => string;
}

const esc = (s: string) => s.replace(/"/g, '\\"');

interface TargetRegistration extends CodeTarget {
  description: string;
}

const TARGETS: Record<TargetId, TargetRegistration> = {
  react: {
    id: 'react',
    name: 'React (TSX)',
    description: 'Function component with JSX',
    generate: (widgets) => {
      const body = widgets
        .map((w) => {
          switch (w.kind) {
            case 'button':
              return `      <Button onClick={() => {}}>${w.label}</Button>`;
            case 'text':
              return `      <Text>${w.label}</Text>`;
            case 'input':
              return `      <Input placeholder="${esc(w.label)}" />`;
            case 'image':
              return `      <Image src="..." alt="${esc(w.label)}" />`;
            case 'card':
              return `      <Card title="${esc(w.label)}">{/* content */}</Card>`;
            case 'checkbox':
              return `      <Checkbox label="${esc(w.label)}" checked={false} onChange={() => {}} />`;
          }
        })
        .join('\n');
      return `export function GeneratedScreen() {\n  return (\n    <Column>\n${body || '      {/* drop components here */}'}\n    </Column>\n  );\n}`;
    },
  },
  compose: {
    id: 'compose',
    name: 'Jetpack Compose (Kotlin)',
    description: 'Composable layout',
    generate: (widgets) => {
      const body = widgets
        .map((w) => {
          switch (w.kind) {
            case 'button':
              return `    Button(onClick = { /* TODO */ }) {\n      Text("${esc(w.label)}")\n    }`;
            case 'text':
              return `    Text("${esc(w.label)}")`;
            case 'input':
              return `    OutlinedTextField(value = "", onValueChange = {}, label = { Text("${esc(w.label)}") })`;
            case 'image':
              return `    Image(painter = painterResource(R.drawable.image), contentDescription = "${esc(w.label)}")`;
            case 'card':
              return `    Card {\n      Text("${esc(w.label)}")\n    }`;
            case 'checkbox':
              return `    Row {\n      Checkbox(checked = false, onCheckedChange = {})\n      Text("${esc(w.label)}")\n    }`;
          }
        })
        .join('\n');
      return `@Composable\nfun GeneratedScreen() {\n  Column {\n${body || '    // drop components here'}\n  }\n}`;
    },
  },
  html: {
    id: 'html',
    name: 'HTML',
    description: 'Plain markup',
    generate: (widgets) => {
      const body = widgets
        .map((w) => {
          switch (w.kind) {
            case 'button':
              return `  <button type="button">${w.label}</button>`;
            case 'text':
              return `  <p>${w.label}</p>`;
            case 'input':
              return `  <input type="text" placeholder="${esc(w.label)}" />`;
            case 'image':
              return `  <img src="" alt="${esc(w.label)}" />`;
            case 'card':
              return `  <section class="card">\n    <h3>${w.label}</h3>\n  </section>`;
            case 'checkbox':
              return `  <label><input type="checkbox" /> ${w.label}</label>`;
          }
        })
        .join('\n');
      return `<div class="screen">\n${body || '  <!-- drop components here -->'}\n</div>`;
    },
  },
};

export function listTargets(): TargetRegistration[] {
  return Object.values(TARGETS);
}

export function getTarget(id: TargetId): CodeTarget {
  return TARGETS[id];
}

export function generateCode(widgets: Widget[], target: TargetId): string {
  return TARGETS[target].generate(widgets);
}

export function newWidget(kind: WidgetKind): Widget {
  const defaults: Record<WidgetKind, string> = {
    button: 'Click me',
    text: 'Hello world',
    input: 'Your name',
    image: 'Photo',
    card: 'Card title',
    checkbox: 'Enable option',
  };
  return { id: `${kind}-${Math.random().toString(36).slice(2, 8)}`, kind, label: defaults[kind] };
}
