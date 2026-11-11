import { useForge } from '../store/store';

export function StatusBar() {
  const rootName = useForge((s) => s.rootName);
  const activePath = useForge((s) => s.activePath);
  const tabs = useForge((s) => s.tabs);
  const contents = useForge((s) => s.contents);
  const savedContents = useForge((s) => s.savedContents);
  const markers = useForge((s) => s.markers);
  const statusMessage = useForge((s) => s.statusMessage);
  const toggleBottom = useForge((s) => s.toggleBottom);

  const dirtyCount = tabs.filter((t) => contents[t.path] !== savedContents[t.path]).length;
  const errorCount = Object.values(markers).flat().filter((m) => m.severity === 'error').length;
  const warningCount = Object.values(markers).flat().filter((m) => m.severity === 'warning').length;

  return (
    <footer className="status-bar">
      <span className="status-item accent">⚒ {rootName || 'Forge'}</span>
      <span className="status-item">{activePath ?? 'no file open'}</span>
      {dirtyCount > 0 && <span className="status-item warn">● {dirtyCount} unsaved</span>}
      <span className="status-item ok">auto-save on</span>
      <div className="status-spacer" />
      {statusMessage && <span className="status-item">{statusMessage}</span>}
      <button className="status-item clickable" onClick={() => toggleBottom('problems')}>
        ✖ {errorCount} ⚠ {warningCount}
      </button>
      <button className="status-item clickable" onClick={() => toggleBottom('terminal')}>Terminal</button>
    </footer>
  );
}
