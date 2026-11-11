import { useEffect, useRef } from 'react';
import { useForge } from '../store/store';
import type { AssistantAction } from '../lib/assistant/provider';

const ACTIONS: { id: AssistantAction; label: string }[] = [
  { id: 'explain', label: 'Explain code' },
  { id: 'errors', label: 'Explain errors' },
  { id: 'improve', label: 'Suggest improvements' },
  { id: 'document', label: 'Generate docs' },
  { id: 'architecture', label: 'Analyze architecture' },
];

function renderText(text: string) {
  const blocks = text.split(/```/);
  return blocks.map((block, i) =>
    i % 2 === 1 ? (
      <pre key={i} className="assistant-code">{block.replace(/^\w*\n/, '')}</pre>
    ) : (
      <span key={i}>
        {block.split('\n').map((line, j) => (
          <span key={j}>
            {line.split(/(\*\*[^*]+\*\*)/).map((part, k) =>
              part.startsWith('**') && part.endsWith('**') ? <strong key={k}>{part.slice(2, -2)}</strong> : part,
            )}
            <br />
          </span>
        ))}
      </span>
    ),
  );
}

export function AssistantPanel() {
  const messages = useForge((s) => s.assistantMessages);
  const busy = useForge((s) => s.assistantBusy);
  const ask = useForge((s) => s.askAssistant);
  const activePath = useForge((s) => s.activePath);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  return (
    <aside className="assistant-panel">
      <div className="panel-header">
        <span>AI ASSISTANT</span>
        <span className="assistant-hint">you control every action</span>
      </div>
      <div className="assistant-actions">
        {ACTIONS.map((action) => (
          <button key={action.id} className="btn action-btn" disabled={busy} onClick={() => void ask(action.id)}>
            {action.label}
          </button>
        ))}
      </div>
      <div className="assistant-thread" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="assistant-empty">
            <p>I help you understand, debug and document your code — I never act on my own.</p>
            <p className="assistant-context">{activePath ? `Context: ${activePath}` : 'Open a file to give me context.'}</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`assistant-msg ${msg.role}`}>
            <div className="msg-role">{msg.role === 'user' ? 'You' : 'Forge Assistant'}</div>
            <div className="msg-body">{renderText(msg.text)}</div>
          </div>
        ))}
        {busy && <div className="assistant-msg assistant"><div className="msg-body typing">Thinking…</div></div>}
      </div>
    </aside>
  );
}
