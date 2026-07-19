import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import {
  Home,
  Sparkles,
  Search,
  Settings,
  User,
  Code,
  Database,
  PanelLeft,
  PanelRight,
  Moon,
  Sun,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

type TopNavProps = {
  onHome: () => void;
};

export default function TopNav({ onHome }: TopNavProps) {
  const {
    datasetName,
    codePanelOpen,
    setCodePanelOpen,
    sidebarOpen,
    setSidebarOpen,
    rightSidebarOpen,
    setRightSidebarOpen,
    setActiveModule,
    theme,
    setTheme,
  } = useApp();

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <>
      <Toaster position="top-center" />
      <motion.nav
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="h-16 glass-panel mx-4 mt-4 px-6 flex items-center justify-between z-50"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white leading-tight">
                CleanFlow <span className="text-gradient">AI</span>
              </h1>
              <p className="text-xs text-white/40">Intelligent data cleaning studio</p>
            </div>
          </div>
          {datasetName && (
            <div className="hidden md:flex items-center gap-2 ml-6 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <Database className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm text-white/70">{datasetName}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center glass-input px-4 py-2 gap-2 w-64">
            <Search className="w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search operations..."
              className="bg-transparent border-none outline-none text-sm text-white placeholder-white/30 w-full"
            />
          </div>
          <button
            onClick={onHome}
            className="p-2.5 rounded-xl glass-button"
            title="Open landing page"
            aria-label="Open landing page"
          >
            <Home className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-2.5 rounded-xl transition-all ${
              sidebarOpen
                ? 'bg-primary/30 border border-primary/40 text-primary'
                : 'glass-button'
            }`}
            title="Toggle Sidebar"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCodePanelOpen(!codePanelOpen)}
            className={`p-2.5 rounded-xl transition-all ${
              codePanelOpen
                ? 'bg-primary/30 border border-primary/40 text-primary'
                : 'glass-button'
            }`}
            title="Toggle Code Panel"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
            className={`p-2.5 rounded-xl transition-all ${
              rightSidebarOpen
                ? 'bg-primary/30 border border-primary/40 text-primary'
                : 'glass-button'
            }`}
            title="Toggle Data Summary"
          >
            <PanelRight className="w-4 h-4" />
          </button>
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl glass-button"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setActiveModule('settings')}
            className="p-2.5 rounded-xl glass-button"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() =>
              toast('User profile coming soon', {
                style: {
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.96)',
                  color: '#0f172a',
                  border: '1px solid rgba(15, 23, 42, 0.08)',
                },
              })
            }
            className="p-2.5 rounded-xl glass-button"
          >
            <User className="w-4 h-4" />
          </button>
        </div>
      </motion.nav>
    </>
  );
}
