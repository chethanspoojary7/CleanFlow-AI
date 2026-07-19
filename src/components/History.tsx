import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { History, Undo2, Redo2, Clock, Code } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getHistory, undo, redo } from '../services/api';

interface HistoryItem {
  id: string;
  timestamp: string;
  operation: string;
  description: string;
  pandas_code: string;
}

export default function HistoryPanel() {
  const { sessionId, refreshDatasetInfo, setGeneratedCode } = useApp();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await getHistory(sessionId);
      setHistory(res.history || []);
    } catch {
      // ignore
    }
  }, [sessionId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleUndo = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      await undo(sessionId);
      await refreshDatasetInfo();
      await fetchHistory();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleRedo = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      await redo(sessionId);
      await refreshDatasetInfo();
      await fetchHistory();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  if (!sessionId) {
    return (
      <div className="flex min-h-full items-center justify-center text-white/30">
        <div className="text-center">
          <History className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>Upload a dataset to view history</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold text-white mb-2">Operation History</h2>
        <p className="text-white/50 text-sm mb-6">Track and revert your data cleaning steps</p>
      </motion.div>

      <div className="flex gap-2 mb-6">
        <button onClick={handleUndo} disabled={loading || history.length === 0} className="flex items-center gap-2 px-4 py-2 rounded-xl glass-button text-sm disabled:opacity-30">
          <Undo2 className="w-4 h-4" /> Undo
        </button>
        <button onClick={handleRedo} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-xl glass-button text-sm disabled:opacity-30">
          <Redo2 className="w-4 h-4" /> Redo
        </button>
      </div>

      <div className="space-y-3 max-w-3xl">
        {history.length === 0 ? (
          <div className="text-center py-12 text-white/30">
            <Clock className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No operations yet</p>
          </div>
        ) : (
          [...history].reverse().map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-4 flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <History className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-white">{item.operation}</span>
                  <span className="text-xs text-white/30">{new Date(item.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-xs text-white/50 mb-2">{item.description}</p>
                {item.pandas_code && (
                  <button
                    onClick={() => setGeneratedCode(item.pandas_code)}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Code className="w-3 h-3" /> View code
                  </button>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
