import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useForge } from '../store/store';

function TerminalView() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const term = new Terminal({
      fontFamily: "'JetBrains Mono', Menlo, monospace",
      fontSize: 12.5,
      theme: {
        background: '#0a0e14',
        foreground: '#d7dde8',
        cursor: '#7c9cff',
        selectionBackground: '#24406e',
        black: '#0d1117',
        green: '#8fd6a5',
        yellow: '#e8b46a',
        blue: '#7c9cff',
        magenta: '#c792ea',
        cyan: '#6fd3e0',
        red: '#e06c75',
      },
      cursorBlink: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(container);
    fit.fit();

    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${window.location.host}/ws/terminal?cols=${term.cols}&rows=${term.rows}`);
    ws.onmessage = (e) => term.write(String(e.data));
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'input', data }));
    });
    const onResize = () => fit.fit();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      ws.close();
      term.dispose();
    };
  }, []);

  return <div ref={containerRef} className="terminal-container" />;
}

export function BottomPanel() {
  const bottomView = useForge((s) => s.bottomView);
  const setBottomView = useForge((s) => s.setBottomView);
  const toggleBottom = useForge((s) => s.toggleBottom);
  const markers = useForge((s) => s.markers);
  const outputLines = useForge((s) => s.outputLines);
  const openSearchHit = useForge((s) => s.openSearchHit);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight });
  }, [outputLines]);

  const problemList = Object.entries(markers).flatMap(([path, list]) => list.map((m) => ({ path, ...m })));

  return (
    <div className="bottom-panel">
      <div className="bottom-tabs">
        {(['terminal', 'problems', 'output'] as const).map((view) => (
          <button key={view} className={`bottom-tab ${bottomView === view ? 'active' : ''}`} onClick={() => setBottomView(view)}>
            {view === 'problems' ? `Problems (${problemList.length})` : view === 'output' ? 'Output' : 'Terminal'}
          </button>
        ))}
        <div className="bottom-spacer" />
        <button className="bottom-close" onClick={() => toggleBottom()}>×</button>
      </div>
      <div className="bottom-body">
        {bottomView === 'terminal' && <TerminalView />}
        {bottomView === 'problems' && (
          <div className="problems-list">
            {problemList.length === 0 && <div className="problems-empty">No problems detected in open files.</div>}
            {problemList.map((p, i) => (
              <button key={i} className={`problem-row ${p.severity}`} onClick={() => void openSearchHit(p.path, p.line)}>
                <span className="problem-severity">{p.severity === 'error' ? '✖' : p.severity === 'warning' ? '⚠' : 'ℹ'}</span>
                <span className="problem-loc">{p.path}:{p.line}</span>
                <span className="problem-msg">{p.message}</span>
              </button>
            ))}
          </div>
        )}
        {bottomView === 'output' && (
          <div className="output-view" ref={outputRef}>
            {outputLines.map((line, i) => (
              <div key={i} className="output-line">{line}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
