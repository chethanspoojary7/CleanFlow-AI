import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileOutput, Download, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { exportDataset } from '../services/api';

const formats = [
  { id: 'csv', label: 'CSV', desc: 'Comma-separated values', color: 'from-primary to-secondary' },
  { id: 'xlsx', label: 'Excel', desc: 'Microsoft Excel (.xlsx)', color: 'from-success to-primary' },
  { id: 'json', label: 'JSON', desc: 'JavaScript Object Notation', color: 'from-warning to-success' },
  { id: 'parquet', label: 'Parquet', desc: 'Apache Parquet format', color: 'from-secondary to-accent' },
];

export default function ExportData() {
  const { sessionId } = useApp();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleExport = async (format: string) => {
    if (!sessionId) return;
    setLoading(true);
    setSuccess(null);
    try {
      const blob = await exportDataset(sessionId, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dataset.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess(`Exported as ${format.toUpperCase()}`);
    } catch {
      setSuccess(null);
    } finally {
      setLoading(false);
    }
  };

  if (!sessionId) {
    return (
      <div className="flex min-h-full items-center justify-center text-white/30">
        <div className="text-center">
          <FileOutput className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>Upload a dataset to export</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold text-white mb-2">Export Dataset</h2>
        <p className="text-white/50 text-sm mb-8">Download your cleaned data in various formats</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        {formats.map((fmt, i) => (
          <motion.button
            key={fmt.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => handleExport(fmt.id)}
            disabled={loading}
            className="glass-card p-5 text-left group disabled:opacity-50"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${fmt.color} flex items-center justify-center mb-3 shadow-glow group-hover:scale-110 transition-transform`}>
              <Download className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">{fmt.label}</h3>
            <p className="text-xs text-white/40">{fmt.desc}</p>
          </motion.button>
        ))}
      </div>

      {success && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 rounded-2xl bg-success/10 border border-success/30 flex items-center gap-3 max-w-2xl"
        >
          <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
          <p className="text-sm text-success">{success}</p>
        </motion.div>
      )}
    </div>
  );
}
