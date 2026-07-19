/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Play, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { featureEngineer } from '../services/api';

export default function FeatureEngineering() {
  const { sessionId, refreshDatasetInfo, setGeneratedCode } = useApp();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [operation, setOperation] = useState('create');
  const [newCol, setNewCol] = useState('');
  const [expr, setExpr] = useState('');
  const [sourceCol, setSourceCol] = useState('');
  const [bins, setBins] = useState('5');

  const handleApply = async () => {
    if (!sessionId) {
      setMessage({ type: 'error', text: 'Please upload a dataset first' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const config: any = { operation };
      if (operation === 'create') {
        config.new_column = newCol;
        config.expression = expr;
      } else if (operation === 'bin') {
        config.column = sourceCol;
        config.bins = parseInt(bins) || 5;
      } else {
        config.column = sourceCol;
      }
      const res = await featureEngineer(sessionId, config);
      await refreshDatasetInfo();
      if (res.pandas_code) setGeneratedCode(res.pandas_code);
      setMessage({ type: 'success', text: res.message || 'Feature engineered successfully' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.error || 'Operation failed' });
    } finally {
      setLoading(false);
    }
  };

  if (!sessionId) {
    return (
      <div className="flex min-h-full items-center justify-center text-white/30">
        <div className="text-center">
          <Cpu className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>Upload a dataset to engineer features</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold text-white mb-2">Feature Engineering</h2>
        <p className="text-white/50 text-sm mb-6">Create new features and transform existing ones</p>
      </motion.div>

      <div className="max-w-2xl glass-card p-5 space-y-4">
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'create', label: 'Calculated Column' },
            { id: 'log', label: 'Log Transform' },
            { id: 'sqrt', label: 'Square Root' },
            { id: 'bin', label: 'Binning' },
          ].map((op) => (
            <button
              key={op.id}
              onClick={() => setOperation(op.id)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                operation === op.id
                  ? 'bg-accent/30 border border-accent/40 text-white'
                  : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
              }`}
            >
              {op.label}
            </button>
          ))}
        </div>

        {operation === 'create' && (
          <>
            <div>
              <label className="text-xs text-white/50 mb-1 block">New column name</label>
              <input type="text" placeholder="e.g. total_price" value={newCol} onChange={(e) => setNewCol(e.target.value)} className="glass-input px-3 py-2 text-sm w-full" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Expression (use df['col'] syntax)</label>
              <input type="text" placeholder="e.g. df['price'] * df['quantity']" value={expr} onChange={(e) => setExpr(e.target.value)} className="glass-input px-3 py-2 text-sm w-full" />
            </div>
          </>
        )}

        {operation !== 'create' && (
          <div>
            <label className="text-xs text-white/50 mb-1 block">Source column</label>
            <input type="text" placeholder="column_name" value={sourceCol} onChange={(e) => setSourceCol(e.target.value)} className="glass-input px-3 py-2 text-sm w-full" />
          </div>
        )}

        {operation === 'bin' && (
          <div>
            <label className="text-xs text-white/50 mb-1 block">Number of bins</label>
            <input type="number" value={bins} onChange={(e) => setBins(e.target.value)} className="glass-input px-3 py-2 text-sm w-full" />
          </div>
        )}

        <button onClick={handleApply} disabled={loading} className="glass-button px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
          {loading ? 'Processing...' : <><Play className="w-3.5 h-3.5" /> Apply</>}
        </button>
      </div>

      {message && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-4 p-4 rounded-2xl border flex items-center gap-2 max-w-2xl ${message.type === 'success' ? 'bg-success/10 border-success/30 text-success' : 'bg-danger/10 border-danger/30 text-danger'}`}>
          {message.type === 'success' ? <Play className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span className="text-sm">{message.text}</span>
        </motion.div>
      )}
    </div>
  );
}
