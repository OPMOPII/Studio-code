import { useEffect } from 'react';
import { useForge } from './store/store';
import { ActivityBar } from './components/ActivityBar';
import { Explorer } from './components/Explorer';
import { SearchPanel } from './components/SearchPanel';
import { ProjectMap } from './components/ProjectMap';
import { UIBuilderPanel } from './components/UIBuilderPanel';
import { MemoryPanel } from './components/MemoryPanel';
import { EditorArea } from './components/EditorArea';
import { AssistantPanel } from './components/AssistantPanel';
import { BottomPanel } from './components/BottomPanel';
import { StatusBar } from './components/StatusBar';

export default function App() {
  const bootstrap = useForge((s) => s.bootstrap);
  const sidebarOpen = useForge((s) => s.sidebarOpen);
  const sidebarView = useForge((s) => s.sidebarView);
  const assistantOpen = useForge((s) => s.assistantOpen);
  const bottomOpen = useForge((s) => s.bottomOpen);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <div className={`app ${sidebarOpen ? '' : 'sidebar-closed'} ${assistantOpen ? '' : 'assistant-closed'} ${bottomOpen ? '' : 'bottom-closed'}`}>
      <ActivityBar />
      {sidebarOpen && (
        <aside className="sidebar">
          {sidebarView === 'explorer' && <Explorer />}
          {sidebarView === 'search' && <SearchPanel />}
          {sidebarView === 'map' && <ProjectMap />}
          {sidebarView === 'uibuilder' && <UIBuilderPanel />}
          {sidebarView === 'memory' && <MemoryPanel />}
        </aside>
      )}
      <main className="main">
        <EditorArea />
        {bottomOpen && <BottomPanel />}
      </main>
      {assistantOpen && <AssistantPanel />}
      <StatusBar />
    </div>
  );
}
