import { useState } from 'react';
import { useForge } from '../store/store';

export function MemoryPanel() {
  const memory = useForge((s) => s.memory);
  const setPreference = useForge((s) => s.setPreference);
  const setNotes = useForge((s) => s.setNotes);
  const [notesDraft, setNotesDraft] = useState(memory.notes);

  return (
    <div className="panel">
      <div className="panel-header"><span>PERSONAL MEMORY</span></div>
      <div className="memory-panel">
        <div className="memory-section">
          <div className="memory-heading">Preferences</div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={memory.preferences.learningMode ?? true}
              onChange={(e) => setPreference('learningMode', e.target.checked)}
            />
            Learning mode on by default
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={memory.preferences.autoSave ?? true}
              onChange={(e) => setPreference('autoSave', e.target.checked)}
            />
            Auto-save
          </label>
          <label className="memory-field">
            Favorite language
            <select
              className="input"
              value={memory.preferences.language ?? ''}
              onChange={(e) => setPreference('language', e.target.value)}
            >
              <option value="">Not set</option>
              <option value="typescript">TypeScript</option>
              <option value="javascript">JavaScript</option>
              <option value="kotlin">Kotlin</option>
              <option value="python">Python</option>
              <option value="rust">Rust</option>
            </select>
          </label>
        </div>
        <div className="memory-section">
          <div className="memory-heading">Project notes</div>
          <textarea
            className="input notes-area"
            placeholder="What are you building? What did you learn today?"
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            onBlur={() => setNotes(notesDraft)}
          />
        </div>
        <div className="memory-section">
          <div className="memory-heading">Recent explanations</div>
          {memory.explanations.length === 0 && <div className="map-empty">Lessons you receive will be listed here.</div>}
          {memory.explanations.map((exp, i) => (
            <div key={i} className="memory-explanation">
              <span>{exp.title}</span>
              <span className="memory-when">{new Date(exp.at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
        <div className="memory-footer">Stored locally in .forge/memory.json — personalization only, nothing leaves your machine.</div>
      </div>
    </div>
  );
}
