import { useState } from 'react';
import { useForge } from '../store/store';
import type { FileNode } from '../api/client';

function FileIcon({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const color =
    ext === 'js' || ext === 'jsx' ? '#e8b46a' : ext === 'ts' || ext === 'tsx' ? '#7c9cff' : ext === 'json' ? '#8fd6a5' : ext === 'md' ? '#6fd3e0' : ext === 'css' ? '#c792ea' : '#8a93a8';
  return <span className="file-dot" style={{ background: color }} />;
}

function Row({ node, depth }: { node: FileNode; depth: number }) {
  const expanded = useForge((s) => s.expanded.has(node.path));
  const activePath = useForge((s) => s.activePath);
  const toggleDir = useForge((s) => s.toggleDir);
  const openFile = useForge((s) => s.openFile);
  const createEntry = useForge((s) => s.createEntry);
  const renameEntry = useForge((s) => s.renameEntry);
  const deleteEntry = useForge((s) => s.deleteEntry);
  const [menuOpen, setMenuOpen] = useState(false);

  const startNew = (kind: 'file' | 'dir') => {
    setMenuOpen(false);
    const name = window.prompt(kind === 'file' ? 'New file name:' : 'New folder name:');
    if (name?.trim()) void createEntry(node.kind === 'dir' ? node.path : node.path.split('/').slice(0, -1).join('/'), name.trim(), kind);
  };

  return (
    <div>
      <div
        className={`tree-row ${activePath === node.path ? 'active' : ''}`}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => (node.kind === 'dir' ? toggleDir(node.path) : void openFile(node.path))}
      >
        {node.kind === 'dir' ? (
          <span className={`chevron ${expanded ? 'open' : ''}`}>▸</span>
        ) : (
          <FileIcon name={node.name} />
        )}
        <span className="tree-name">{node.name}</span>
        <button
          className="row-action"
          title="Actions"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
        >
          ⋯
        </button>
        {menuOpen && (
          <div className="row-menu" onClick={(e) => e.stopPropagation()}>
            {node.kind === 'dir' && (
              <>
                <button onClick={() => startNew('file')}>New file</button>
                <button onClick={() => startNew('dir')}>New folder</button>
              </>
            )}
            <button
              onClick={() => {
                setMenuOpen(false);
                const name = window.prompt('Rename:', node.name);
                if (name?.trim()) void renameEntry(node.path, name.trim());
              }}
            >
              Rename
            </button>
            <button
              className="danger"
              onClick={() => {
                setMenuOpen(false);
                if (window.confirm(`Delete ${node.name}?`)) void deleteEntry(node.path);
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
      {node.kind === 'dir' && expanded &&
        (node.children ?? []).map((child) => <Row key={child.path} node={child} depth={depth + 1} />)}
    </div>
  );
}

export function Explorer() {
  const tree = useForge((s) => s.tree);
  const rootName = useForge((s) => s.rootName);
  const createEntry = useForge((s) => s.createEntry);

  const newRootItem = (kind: 'file' | 'dir') => {
    const name = window.prompt(kind === 'file' ? 'New file name:' : 'New folder name:');
    if (name?.trim()) void createEntry('', name.trim(), kind);
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <span>EXPLORER</span>
        <div className="panel-actions">
          <button title="New file" onClick={() => newRootItem('file')}>+ File</button>
          <button title="New folder" onClick={() => newRootItem('dir')}>+ Folder</button>
        </div>
      </div>
      <div className="panel-body">
        <div className="tree-root-label">{rootName}</div>
        {tree.map((node) => (
          <Row key={node.path} node={node} depth={1} />
        ))}
      </div>
    </div>
  );
}
