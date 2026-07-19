import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Table,
  Brush,
  ArrowLeftRight,
  Calculator,
  FileOutput,
  History,
  Settings,
  Upload,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'preview', label: 'Data Preview', icon: Table },
  { id: 'cleaning', label: 'Data Cleaning', icon: Brush },
  { id: 'transformation', label: 'Transformation', icon: ArrowLeftRight },
  { id: 'statistics', label: 'Statistics', icon: Calculator },
  { id: 'export', label: 'Export', icon: FileOutput },
  { id: 'history', label: 'History', icon: History },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const { activeModule, setActiveModule, setSidebarOpen } = useApp();

  return (
    <motion.aside
      initial={{ x: -280, opacity: 0, width: 0, margin: 0 }}
      animate={{ x: 0, opacity: 1, width: 256, margin: 0 }}
      exit={{ x: -280, opacity: 0, width: 0, margin: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="glass-panel flex shrink-0 flex-col overflow-hidden"
    >
      <div className="p-4 border-b border-white/10 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          Menu
        </h3>
        <button onClick={() => setSidebarOpen(false)} className="text-white/50 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 flex-1 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveModule(item.id)}
                className={`nav-item w-full text-left ${isActive ? 'active' : ''}`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : ''}`} />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.aside>
  );
}
