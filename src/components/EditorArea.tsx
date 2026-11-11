import { useEffect, useRef, useState } from 'react';
import { monaco, languageFor } from '../lib/monaco';
import { useForge } from '../store/store';
import { editorBus } from '../lib/editorBus';

export function EditorArea() {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const modelsRef = useRef(new Map<string, monaco.editor.ITextModel>());
  const learningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tabs = useForge((s) => s.tabs);
  const activePath = useForge((s) => s.activePath);
  const contents = useForge((s) => s.contents);
  const savedContents = useForge((s) => s.savedContents);
  const setActive = useForge((s) => s.setActive);
  const closeTab = useForge((s) => s.closeTab);
  const saveNow = useForge((s) => s.saveNow);
  const pendingReveal = useForge((s) => s.pendingReveal);
  const clearReveal = useForge((s) => s.clearReveal);
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const [learningCollapsed, setLearningCollapsed] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const editor = monaco.editor.create(containerRef.current, {
      theme: 'forge-dark',
      automaticLayout: true,
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
      fontLigatures: true,
      minimap: { enabled: true, scale: 1 },
      smoothScrolling: true,
      cursorBlinking: 'phase',
      cursorSmoothCaretAnimation: 'on',
      padding: { top: 12 },
      scrollBeyondLastLine: false,
      renderLineHighlight: 'all',
    });
    editorRef.current = editor;

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => void useForge.getState().saveNow());

    editor.onDidChangeModelContent(() => {
      const model = editor.getModel();
      if (!model) return;
      const path = model.uri.path.replace(/^\//, '');
      useForge.getState().setContent(path, model.getValue());
      if (learningTimer.current) clearTimeout(learningTimer.current);
      learningTimer.current = setTimeout(() => useForge.getState().refreshLessons(), 600);
    });

    editor.onDidChangeCursorPosition((e) => setCursor({ line: e.position.lineNumber, column: e.position.column }));

    monaco.editor.onDidChangeMarkers((uris) => {
      const model = editor.getModel();
      if (!model) return;
      for (const uri of uris) {
        if (uri.toString() !== model.uri.toString()) continue;
        const raw = monaco.editor.getModelMarkers({ resource: uri });
        useForge.getState().setMarkers(
          model.uri.path.replace(/^\//, ''),
          raw.map((m) => ({
            severity: m.severity === monaco.MarkerSeverity.Error ? 'error' : m.severity === monaco.MarkerSeverity.Warning ? 'warning' : 'info',
            message: m.message,
            code: typeof m.code === 'string' ? m.code : undefined,
            line: m.startLineNumber,
          })),
        );
      }
    });

    editorBus.register((code) => {
      const model = editor.getModel();
      if (!model) return;
      const position = editor.getPosition();
      editor.executeEdits('forge-insert', [{ range: monaco.Range.fromPositions(position ?? new monaco.Position(1, 1), position ?? new monaco.Position(1, 1)), text: code }]);
    });

    return () => {
      editorBus.register(null);
      editor.dispose();
      modelsRef.current.forEach((m) => m.dispose());
      modelsRef.current.clear();
      editorRef.current = null;
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !activePath) return;
    let model = modelsRef.current.get(activePath);
    if (!model) {
      const content = contents[activePath];
      if (content === undefined) return;
      model = monaco.editor.createModel(content, languageFor(activePath), monaco.Uri.file(`/${activePath}`));
      modelsRef.current.set(activePath, model);
    }
    if (editor.getModel() !== model) editor.setModel(model);
  }, [activePath, contents]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !pendingReveal || pendingReveal.path !== activePath) return;
    editor.revealLineInCenter(pendingReveal.line);
    editor.setPosition({ lineNumber: pendingReveal.line, column: 1 });
    editor.focus();
    clearReveal();
  }, [pendingReveal, activePath, clearReveal]);

  const activeContent = activePath ? (contents[activePath] ?? '') : '';
  const savedContent = activePath ? (savedContents[activePath] ?? '') : '';
  const dirty = activeContent !== savedContent;
  const learningLesson = useForge((s) => s.learningLesson);
  const learningOpen = useForge((s) => s.learningOpen);
  const setLearningOpen = (v: boolean) => useForge.setState({ learningOpen: v });

  return (
    <div className="editor-area">
      <div className="tabs-bar">
        {tabs.map((tab) => (
          <div
            key={tab.path}
            className={`tab ${activePath === tab.path ? 'active' : ''} ${contents[tab.path] !== savedContents[tab.path] ? 'dirty' : ''}`}
            onClick={() => setActive(tab.path)}
          >
            <span className="tab-name">{tab.path.split('/').pop()}</span>
            <button className="tab-close" onClick={(e) => { e.stopPropagation(); closeTab(tab.path); }}>×</button>
          </div>
        ))}
      </div>
      <div className="editor-body">
        <div ref={containerRef} className="monaco-container" />
        {activePath && learningOpen && learningLesson && (
          <div className={`learning-card ${learningCollapsed ? 'collapsed' : ''}`}>
            <div className="learning-header" onClick={() => setLearningCollapsed((v) => !v)}>
              <span className="learning-badge">LEARNING MODE</span>
              <span className="learning-title">{learningLesson.title}</span>
              <button
                className="learning-close"
                title="Hide learning mode"
                onClick={(e) => {
                  e.stopPropagation();
                  setLearningOpen(false);
                }}
              >
                ×
              </button>
            </div>
            {!learningCollapsed && (
              <div className="learning-body">
                <p>{learningLesson.summary}</p>
                <ul>
                  {learningLesson.points.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
                {learningLesson.example && <pre className="learning-example">{learningLesson.example}</pre>}
              </div>
            )}
          </div>
        )}
        {activePath && !learningOpen && (
          <button className="learning-restore" title="Show learning mode" onClick={() => setLearningOpen(true)}>
            Learn
          </button>
        )}
        {dirty && <button className="save-pill" onClick={() => void saveNow()}>Unsaved — save now</button>}
      </div>
      {!activePath && <div className="editor-empty">Open a file from the explorer to start forging.</div>}
      <div className="cursor-info">{cursor.line}:{cursor.column}</div>
    </div>
  );
}
