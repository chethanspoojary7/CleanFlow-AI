import { useEffect, useRef, useState } from 'react';
import { useApp, AppProvider } from './context/AppContext';
import { AnimatePresence } from 'framer-motion';
import TopNav from './components/TopNav';
import Sidebar from './components/Sidebar';
import RightSidebar from './components/RightSidebar';
import CodePanel from './components/CodePanel';
import Dashboard from './components/Dashboard';
import UploadDataset from './components/UploadDataset';
import DataPreview from './components/DataPreview';
import DataCleaning from './components/DataCleaning';
import DataTransformation from './components/DataTransformation';
import Statistics from './components/Statistics';
import ExportData from './components/ExportData';
import HistoryPanel from './components/History';
import SettingsPanel from './components/Settings';
import LandingPage from './components/LandingPage';

function Workspace() {
  const { activeModule } = useApp();
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    workspaceRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeModule]);

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard': return <Dashboard />;
      case 'upload': return <UploadDataset />;
      case 'preview': return <DataPreview />;
      case 'cleaning': return <DataCleaning />;
      case 'transformation': return <DataTransformation />;
      case 'statistics': return <Statistics />;
      case 'export': return <ExportData />;
      case 'history': return <HistoryPanel />;
      case 'settings': return <SettingsPanel />;
      default: return <Dashboard />;
    }
  };

  return (
    <div ref={workspaceRef} className="glass-panel flex flex-1 min-h-0 flex-col overflow-y-auto">
      {renderModule()}
    </div>
  );
}

function WorkspaceShell({ onHome }: { onHome: () => void }) {
  const { sidebarOpen, rightSidebarOpen } = useApp();

  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <TopNav onHome={onHome} />
      <div className="flex min-h-0 flex-1 gap-4 px-4 pb-4 pt-4 overflow-hidden">
        <AnimatePresence>
          {sidebarOpen && <Sidebar />}
        </AnimatePresence>
        <Workspace />
        <AnimatePresence>
          {rightSidebarOpen && <RightSidebar />}
        </AnimatePresence>
      </div>
      <CodePanel />
    </div>
  );
}

function App() {
  const [showLanding, setShowLanding] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.sessionStorage.getItem('cleanflow-entered') !== 'true';
  });

  const handleEnter = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('cleanflow-entered', 'true');
    }
    setShowLanding(false);
  };

  const handleHome = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('cleanflow-entered');
    }
    setShowLanding(true);
  };

  return (
    <AppProvider>
      {showLanding ? <LandingPage onEnter={handleEnter} /> : <WorkspaceShell onHome={handleHome} />}
    </AppProvider>
  );
}

export default App;
