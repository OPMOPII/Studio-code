import { useState } from 'react';
import { useForge } from '../store/store';
import { editorBus } from '../lib/editorBus';
import { generateCode, listTargets, newWidget, type TargetId, type Widget, type WidgetKind } from '../lib/uibuilder/codegen';

const PALETTE: { kind: WidgetKind; icon: string; label: string }[] = [
  { kind: 'button', icon: '▭', label: 'Button' },
  { kind: 'text', icon: 'T', label: 'Text' },
  { kind: 'input', icon: '⌶', label: 'Input' },
  { kind: 'image', icon: '🖼', label: 'Image' },
  { kind: 'card', icon: '▢', label: 'Card' },
  { kind: 'checkbox', icon: '☑', label: 'Checkbox' },
];

export function UIBuilderPanel() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [target, setTarget] = useState<TargetId>('react');
  const [copied, setCopied] = useState(false);
  const activePath = useForge((s) => s.activePath);
  const targets = listTargets();
  const code = generateCode(widgets, target);

  const drop = (e: React.DragEvent) => {
    e.preventDefault();
    const kind = e.dataTransfer.getData('application/x-forge-widget') as WidgetKind;
    if (kind) setWidgets((w) => [...w, newWidget(kind)]);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="panel">
      <div className="panel-header"><span>UI BUILDER</span></div>
      <div className="uibuilder">
        <div className="palette">
          {PALETTE.map((item) => (
            <div
              key={item.kind}
              className="palette-item"
              draggable
              onDragStart={(e) => e.dataTransfer.setData('application/x-forge-widget', item.kind)}
            >
              <span className="palette-icon">{item.icon}</span>
              {item.label}
            </div>
          ))}
        </div>
        <div className="drop-canvas" onDragOver={(e) => e.preventDefault()} onDrop={drop}>
          {widgets.length === 0 && <div className="drop-hint">Drag components here</div>}
          {widgets.map((w) => (
            <div key={w.id} className="dropped-widget">
              <span>{w.kind}</span>
              <span className="dropped-label">{w.label}</span>
              <button onClick={() => setWidgets((list) => list.filter((x) => x.id !== w.id))}>×</button>
            </div>
          ))}
        </div>
        <select className="input target-select" value={target} onChange={(e) => setTarget(e.target.value as TargetId)}>
          {targets.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <pre className="generated-code">{code}</pre>
        <div className="uibuilder-actions">
          <button className="btn" onClick={() => void copy()}>{copied ? 'Copied!' : 'Copy code'}</button>
          <button className="btn primary" disabled={!activePath} title={activePath ? '' : 'Open a file first'} onClick={() => editorBus.insert('\n' + code + '\n')}>
            Insert at cursor
          </button>
        </div>
      </div>
    </div>
  );
}
