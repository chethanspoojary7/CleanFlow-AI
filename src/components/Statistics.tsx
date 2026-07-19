/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Calculator, BarChart2, Activity } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getStatistics, getDescribe } from '../services/api';

export default function Statistics() {
  const { sessionId } = useApp();
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [describe, setDescribe] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const [s, d] = await Promise.all([getStatistics(sessionId), getDescribe(sessionId)]);
      setStats(s);
      setDescribe(d);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (!sessionId) {
    return (
      <div className="flex min-h-full items-center justify-center text-white/30">
        <div className="text-center">
          <Calculator className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>Upload a dataset to view statistics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold text-white mb-2">Statistics</h2>
        <p className="text-white/50 text-sm mb-6">Descriptive statistics and data profiling</p>
      </motion.div>

      {loading ? (
        <div className="text-center py-12 text-white/30">Loading statistics...</div>
      ) : (
        <div className="space-y-6 max-w-4xl">
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats).map(([key, value]) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs text-white/50 uppercase tracking-wider">{key.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="text-lg font-semibold text-white">
                    {typeof value === 'number' ? value.toFixed(4) : String(value)}
                  </p>
                </motion.div>
              ))}
            </div>
          )}

          {describe && (
            <div className="glass-card p-5 overflow-x-auto">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-secondary" />
                Describe
              </h3>
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-white/50">Statistic</th>
                    {Object.keys(describe).map((col) => (
                      <th key={col} className="px-3 py-2 text-left text-white/70">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {['count', 'mean', 'std', 'min', '25%', '50%', '75%', 'max'].map((stat) => (
                    <tr key={stat} className="border-t border-white/5">
                      <td className="px-3 py-2 text-white/50 font-medium">{stat}</td>
                      {Object.values(describe).map((colStats: any, i) => (
                        <td key={i} className="px-3 py-2 text-white/70">
                          {colStats[stat] != null ? Number(colStats[stat]).toFixed(4) : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
