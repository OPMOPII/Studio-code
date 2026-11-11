import { useState } from 'react';
import { useForge } from '../store/store';

export function SearchPanel() {
  const searchHits = useForge((s) => s.searchHits);
  const searchQuery = useForge((s) => s.searchQuery);
  const searchCaseSensitive = useForge((s) => s.searchCaseSensitive);
  const runSearch = useForge((s) => s.runSearch);
  const openSearchHit = useForge((s) => s.openSearchHit);
  const [draft, setDraft] = useState(searchQuery);

  const grouped = new Map<string, typeof searchHits>();
  for (const hit of searchHits) {
    if (!grouped.has(hit.path)) grouped.set(hit.path, []);
    grouped.get(hit.path)!.push(hit);
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span>SEARCH IN PROJECT</span>
      </div>
      <div className="panel-toolbar">
        <input
          className="input"
          placeholder="Search across all files…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void runSearch(draft, searchCaseSensitive)}
        />
        <label className="checkbox-label">
          <input type="checkbox" checked={searchCaseSensitive} onChange={(e) => void runSearch(draft, e.target.checked)} />
          Aa
        </label>
        <button className="btn" onClick={() => void runSearch(draft, searchCaseSensitive)}>Search</button>
      </div>
      <div className="panel-body">
        {searchQuery && <div className="search-summary">{searchHits.length} result(s) in {grouped.size} file(s)</div>}
        {[...grouped.entries()].map(([path, hits]) => (
          <div key={path} className="search-group">
            <div className="search-file">{path}</div>
            {hits.map((hit, i) => (
              <button key={i} className="search-hit" onClick={() => void openSearchHit(hit.path, hit.line)}>
                <span className="hit-line">:{hit.line}</span> {hit.text.trim().slice(0, 80)}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
