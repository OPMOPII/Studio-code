import { useForge, type SidebarView } from '../store/store';

const ICONS: Record<string, string> = {
  explorer: 'M3 3h6l2 2h10v4H3V3zm0 8h18v10H3V11z',
  search: 'M10 2a8 8 0 105.3 14l5.4 5.4 1.4-1.4-5.4-5.4A8 8 0 0010 2zm0 2a6 6 0 110 12 6 6 0 010-12z',
  map: 'M9 2v7H2v2h7v11h2V11h7V9h-7V2H9z',
  uibuilder: 'M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z',
  memory: 'M12 2a4 4 0 00-4 4v1H6v12h12V7h-2V6a4 4 0 00-4-4zm-2 4a2 2 0 114 0v1h-4V6z',
};

const VIEWS: { id: SidebarView; icon: string; label: string }[] = [
  { id: 'explorer', icon: ICONS.explorer, label: 'Explorer' },
  { id: 'search', icon: ICONS.search, label: 'Search' },
  { id: 'map', icon: ICONS.map, label: 'Project Map' },
  { id: 'uibuilder', icon: ICONS.uibuilder, label: 'UI Builder' },
  { id: 'memory', icon: ICONS.memory, label: 'Memory' },
];

export function ActivityBar() {
  const sidebarView = useForge((s) => s.sidebarView);
  const setSidebarView = useForge((s) => s.setSidebarView);
  const sidebarOpen = useForge((s) => s.sidebarOpen);
  const toggleSidebar = useForge((s) => s.toggleSidebar);
  const assistantOpen = useForge((s) => s.assistantOpen);
  const toggleAssistant = useForge((s) => s.toggleAssistant);
  const toggleBottom = useForge((s) => s.toggleBottom);

  return (
    <nav className="activity-bar">
      {VIEWS.map((view) => (
        <button
          key={view.id}
          className={`activity-btn ${sidebarView === view.id && sidebarOpen ? 'active' : ''}`}
          title={view.label}
          onClick={() => (sidebarView === view.id && sidebarOpen ? toggleSidebar() : setSidebarView(view.id))}
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path d={view.icon} fill="currentColor" />
          </svg>
        </button>
      ))}
      <div className="activity-spacer" />
      <button className="activity-btn" title="Toggle terminal" onClick={() => toggleBottom('terminal')}>
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path d="M3 4h18v16H3V4zm2 2v12h14V6H5zm2 2l3 3-3 3 1.5 1.5L11 12.5 8.5 8H7zm6 6h5v2h-5v-2z" fill="currentColor" />
        </svg>
      </button>
      <button className={`activity-btn ${assistantOpen ? 'active' : ''}`} title="Toggle AI assistant" onClick={toggleAssistant}>
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path d="M12 2l2.4 5.6L20 10l-5.6 2.4L12 18l-2.4-5.6L4 10l5.6-2.4L12 2zm7 12l1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14z" fill="currentColor" />
        </svg>
      </button>
    </nav>
  );
}
