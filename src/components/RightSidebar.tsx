import { motion } from 'framer-motion';
import {
  Rows,
  Columns,
  HardDrive,
  AlertTriangle,
  Copy,
  Undo2,
  Redo2,
  Database,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { undo, redo } from '../services/api';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';

const getErrorMessage = (err: unknown, fallback: string) => {
  const axiosError = err as AxiosError<{ error?: string }>;
  return axiosError.response?.data?.error || fallback;
};

export default function RightSidebar() {
  const { sessionId, datasetInfo, canUndo, canRedo, setRightSidebarOpen, refreshDatasetInfo } = useApp();

  const handleUndo = async () => {
    if (!sessionId) return;
    try {
      const res = await undo(sessionId);
      toast.success(res.message);
      await refreshDatasetInfo();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Undo failed'));
    }
  };

  const handleRedo = async () => {
    if (!sessionId) return;
    try {
      const res = await redo(sessionId);
      toast.success(res.message);
      await refreshDatasetInfo();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Redo failed'));
    }
  };

  return (
    <motion.aside
      initial={{ x: 320, opacity: 0, width: 0, margin: 0 }}
      animate={{ x: 0, opacity: 1, width: 288, margin: 0 }}
      exit={{ x: 320, opacity: 0, width: 0, margin: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="glass-panel flex shrink-0 flex-col overflow-hidden"
    >
      <div className="p-4 border-b border-white/10 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          Dataset Summary
        </h3>
        <button onClick={() => setRightSidebarOpen(false)} className="text-white/50 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 flex-1 overflow-y-auto space-y-4">
        {datasetInfo ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <SummaryCard icon={Rows} label="Rows" value={datasetInfo.rows.toLocaleString()} color="text-primary" />
              <SummaryCard icon={Columns} label="Columns" value={datasetInfo.columns.toLocaleString()} color="text-secondary" />
              <SummaryCard icon={HardDrive} label="Memory" value={datasetInfo.memory} color="text-accent" />
              <SummaryCard icon={AlertTriangle} label="Missing" value={datasetInfo.missing_values.toLocaleString()} color="text-warning" />
              <SummaryCard icon={Copy} label="Duplicates" value={datasetInfo.duplicate_rows.toLocaleString()} color="text-danger" />
            </div>

            <div className="glass-card p-3">
              <h4 className="text-xs font-semibold text-white/60 mb-2 uppercase tracking-wider">Data Types</h4>
              <div className="space-y-1.5">
                {Object.entries(datasetInfo.dtypes || {}).slice(0, 8).map(([col, dtype]) => (
                  <div key={col} className="flex items-center justify-between text-xs">
                    <span className="text-white/70 truncate max-w-[120px]">{col}</span>
                    <span className="px-2 py-0.5 rounded-md bg-white/5 text-white/50 text-[10px]">{dtype}</span>
                  </div>
                ))}
                {Object.keys(datasetInfo.dtypes || {}).length > 8 && (
                  <div className="text-xs text-white/40 text-center">+{Object.keys(datasetInfo.dtypes).length - 8} more</div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-white/30 text-sm">
            No dataset loaded
          </div>
        )}
      </div>
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl glass-button text-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Undo
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl glass-button text-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Redo2 className="w-3.5 h-3.5" />
            Redo
          </button>
        </div>
      </div>
    </motion.aside>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="glass-card p-3 flex flex-col items-center text-center">
      <Icon className={`w-4 h-4 ${color} mb-1`} />
      <span className="text-xs text-white/50">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}
