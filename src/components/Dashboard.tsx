import { motion } from 'framer-motion';
import {
  Upload,
  Table,
  Sparkles,
  FileSpreadsheet,
  ArrowRight,
  Database,
  ArrowLeftRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Dashboard() {
  const { setActiveModule, datasetInfo, datasetName } = useApp();

  const quickActions = [
    { id: 'upload', label: 'Upload Dataset', icon: Upload, desc: 'Import CSV, Excel, JSON', color: 'from-primary to-secondary' },
    { id: 'preview', label: 'Data Preview', icon: Table, desc: 'Explore your data', color: 'from-secondary to-accent' },
    { id: 'cleaning', label: 'Data Cleaning', icon: Sparkles, desc: 'Fix missing values and duplicates', color: 'from-accent to-primary' },
    { id: 'transformation', label: 'Transform', icon: ArrowLeftRight, desc: 'Rename, clean, and reshape columns', color: 'from-primary to-accent' },
  ];

  const recentFiles = [
    { name: 'customer_data.csv', rows: 15420, cols: 18, date: '2 hours ago' },
    { name: 'sales_report.xlsx', rows: 8930, cols: 12, date: 'Yesterday' },
    { name: 'survey_results.json', rows: 5200, cols: 25, date: '3 days ago' },
  ];

  return (
    <div className="min-h-full p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-2xl font-bold text-white mb-1">Workspace overview</h2>
        <p className="text-white/50 text-sm">Your data cleaning workspace at a glance</p>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action, i) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              onClick={() => setActiveModule(action.id)}
              className="glass-card group p-5 text-left"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 shadow-glow group-hover:scale-110 transition-transform`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">{action.label}</h3>
              <p className="text-xs text-white/40 mb-3">{action.desc}</p>
              <div className="flex items-center gap-1 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Get started <ArrowRight className="w-3 h-3" />
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="glass-card lg:col-span-2 p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            Recent datasets
          </h3>
          <div className="space-y-2">
            {recentFiles.map((file, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-3 transition-all hover:border-primary/30 hover:bg-white/8"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                    <Database className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{file.name}</p>
                    <p className="text-xs text-white/40">
                      {file.rows.toLocaleString()} rows / {file.cols} columns
                    </p>
                  </div>
                </div>
                <span className="text-xs text-white/30">{file.date}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="glass-card p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-4">Current dataset</h3>
          {datasetName && datasetInfo ? (
            <div className="space-y-3">
              <div className="py-4 text-center">
                <Database className="mx-auto mb-2 h-10 w-10 text-primary" />
                <p className="text-sm font-medium text-white">{datasetName}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-white/5 p-2 text-center">
                  <p className="text-white/40">Rows</p>
                  <p className="font-semibold text-white">{datasetInfo.rows.toLocaleString()}</p>
                </div>
                <div className="rounded-lg bg-white/5 p-2 text-center">
                  <p className="text-white/40">Columns</p>
                  <p className="font-semibold text-white">{datasetInfo.columns}</p>
                </div>
                <div className="rounded-lg bg-white/5 p-2 text-center">
                  <p className="text-white/40">Missing</p>
                  <p className="font-semibold text-warning">{datasetInfo.missing_values}</p>
                </div>
                <div className="rounded-lg bg-white/5 p-2 text-center">
                  <p className="text-white/40">Duplicates</p>
                  <p className="font-semibold text-danger">{datasetInfo.duplicate_rows}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-white/30">
              <Upload className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>No dataset loaded</p>
              <button
                onClick={() => setActiveModule('upload')}
                className="mt-3 text-xs text-primary hover:underline"
              >
                Upload a dataset
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
