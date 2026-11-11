import { useEffect, useState } from 'react';
import { useForge } from '../store/store';
import { api, type FileNode } from '../api/client';
import { buildGraph, clusterByDirectory, flattenFiles } from '../lib/graph/imports';

export function ProjectMap() {
  const tree = useForge((s) => s.tree);
  const openFile = useForge((s) => s.openFile);
  const [graph, setGraph] = useState<ReturnType<typeof buildGraph> | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const files = flattenFiles(tree);
      const contents = new Map<string, string>();
      for (const file of files.slice(0, 200)) {
        if (/\.(js|jsx|ts|tsx|mjs|kt|py|css|json)$/.test(file.name)) {
          try {
            const { content } = await api.readFile(file.path);
            contents.set(file.path, content);
          } catch {
            contents.set(file.path, '');
          }
        } else {
          contents.set(file.path, '');
        }
      }
      if (cancelled) return;
      setGraph(buildGraph(files, (p) => contents.get(p)));
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [tree]);

  const clusters = graph ? clusterByDirectory(graph) : [];
  const selectedNode = selected ? (graph?.get(selected) ?? null) : null;

  const renderDir = (node: FileNode, depth: number) => {
    if (node.kind === 'file') {
      const g = graph?.get(node.path);
      const deps = (g?.imports.length ?? 0) + (g?.importedBy.length ?? 0);
      return (
        <button
          key={node.path}
          className={`map-file ${selected === node.path ? 'selected' : ''}`}
          style={{ marginLeft: depth * 16 }}
          onClick={() => setSelected(node.path)}
          onDoubleClick={() => void openFile(node.path)}
        >
          <span className="map-name">{node.name}</span>
          {deps > 0 && <span className="map-deps">{deps} link{deps > 1 ? 's' : ''}</span>}
        </button>
      );
    }
    return (
      <div key={node.path}>
        <div className="map-dir" style={{ marginLeft: depth * 16 }}>▸ {node.name}/</div>
        {(node.children ?? []).map((child) => renderDir(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="panel">
      <div className="panel-header"><span>PROJECT MAP</span></div>
      <div className="map-layout">
        <div className="map-tree">
          {tree.map((node) => renderDir(node, 0))}
        </div>
        <div className="map-detail">
          {selectedNode ? (
            <>
              <div className="map-detail-title">{selectedNode.name}</div>
              <div className="map-detail-section">
                <div className="map-detail-heading">Imports ({selectedNode.imports.length})</div>
                {selectedNode.imports.map((p) => (
                  <button key={p} className="map-link" onClick={() => setSelected(p)}>{p}</button>
                ))}
                {selectedNode.imports.length === 0 && <div className="map-empty">No local imports</div>}
              </div>
              <div className="map-detail-section">
                <div className="map-detail-heading">Imported by ({selectedNode.importedBy.length})</div>
                {selectedNode.importedBy.map((p) => (
                  <button key={p} className="map-link" onClick={() => setSelected(p)}>{p}</button>
                ))}
                {selectedNode.importedBy.length === 0 && <div className="map-empty">Nothing imports this file yet</div>}
              </div>
            </>
          ) : (
            <div className="map-empty">Select a file to see how it connects. Double-click to open it.</div>
          )}
          <div className="map-clusters">
            <div className="map-detail-heading">Modules</div>
            {clusters.map((c) => (
              <div key={c.dir} className="map-cluster">
                <span>{c.dir}</span>
                <span className="map-cluster-meta">{c.files.length} files · {c.internalDeps} int · {c.externalDeps} ext</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
