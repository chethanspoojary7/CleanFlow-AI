import { motion } from 'framer-motion';
import { Moon, Sun, Keyboard, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function SettingsPanel() {
  const { theme, setTheme } = useApp();
  const isLight = theme === 'light';
  const toggleTheme = () => setTheme(isLight ? 'dark' : 'light');

  return (
    <div className="min-h-full p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold text-white mb-2">Settings</h2>
        <p className="text-white/50 text-sm mb-6">Configure your workspace preferences</p>
      </motion.div>

      <div className="max-w-2xl space-y-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-4">
            {isLight ? <Sun className="w-5 h-5 text-primary" /> : <Moon className="w-5 h-5 text-primary" />}
            <h3 className="text-sm font-semibold text-white">Appearance</h3>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-white/70">{isLight ? 'Light Mode' : 'Dark Mode'}</span>
            <button
              onClick={toggleTheme}
              className="w-11 h-6 rounded-full bg-primary/30 flex items-center px-0.5 transition-colors"
              role="switch"
              aria-checked={isLight}
              aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              <div className={`w-5 h-5 rounded-full bg-primary shadow-glow transition-transform ${isLight ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <Keyboard className="w-5 h-5 text-secondary" />
            <h3 className="text-sm font-semibold text-white">Keyboard Shortcuts</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-white/60">Undo</span>
              <span className="text-white/40 font-mono">Ctrl + Z</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-white/60">Redo</span>
              <span className="text-white/40 font-mono">Ctrl + Y</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-white/60">Toggle Code Panel</span>
              <span className="text-white/40 font-mono">Ctrl + `</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-white/60">Search</span>
              <span className="text-white/40 font-mono">Ctrl + K</span>
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <Info className="w-5 h-5 text-accent" />
            <h3 className="text-sm font-semibold text-white">About</h3>
          </div>
          <p className="text-sm text-white/60">
            CleanFlow AI v1.0 - Intelligent Data Cleaning Studio
          </p>
          <p className="text-xs text-white/40 mt-1">
            Built for data science students and professionals.
          </p>
        </div>
      </div>
    </div>
  );
}
