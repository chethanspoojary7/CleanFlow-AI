import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeftRight,
  Columns,
  Type,
  ChevronDown,
  ChevronUp,
  Play,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  renameColumn,
  dropColumn,
  duplicateColumn,
  stringClean,
  getAutoDetect,
} from '../services/api';
import type { AutoDetectRecommendation } from '../types';
import {
  type ColumnSuggestion,
  getAutoDetectRecommendations,
  getDropSuggestions,
  getNumericColumns,
  getRecommendationColumns,
  getRenameSuggestions,
  getTextColumns,
  getUsefulColumns,
  normalizeColumnName,
} from '../utils/columnSuggestions';

const sections = [
  { id: 'columns', label: 'Column Operations', icon: Columns },
  { id: 'strings', label: 'String Cleaning', icon: Type },
  { id: 'numbers', label: 'Numeric Cleaning', icon: Type },
];

type OperationConfig = Record<string, string | undefined>;

export default function DataTransformation() {
  const { sessionId, datasetInfo, refreshDatasetInfo, setGeneratedCode } = useApp();
  const [activeSection, setActiveSection] = useState<string | null>('columns');
  const [loading, setLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoRecommendations, setAutoRecommendations] = useState<AutoDetectRecommendation[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setAutoRecommendations([]);
      return;
    }

    let alive = true;

    const loadAutoRecommendations = async () => {
      setAutoLoading(true);
      try {
        const res = await getAutoDetect(sessionId);
        if (!alive) return;
        setAutoRecommendations(res.recommendations || []);
      } catch {
        if (!alive) return;
        setAutoRecommendations([]);
      } finally {
        if (alive) setAutoLoading(false);
      }
    };

    void loadAutoRecommendations();

    return () => {
      alive = false;
    };
  }, [sessionId, datasetInfo]);

  const stringSuggestions = useMemo(
    () =>
      getAutoDetectRecommendations(autoRecommendations, 'string_clean').filter(
        (item) => item.config.operation !== 'extract'
      ),
    [autoRecommendations]
  );
  const numericSuggestions = useMemo(() => getNumericColumns(datasetInfo), [datasetInfo]);
  const textSuggestions = useMemo(() => getTextColumns(datasetInfo), [datasetInfo]);
  const renameSuggestions = useMemo(() => getRenameSuggestions(datasetInfo), [datasetInfo]);
  const dropSuggestions = useMemo(() => getDropSuggestions(datasetInfo), [datasetInfo]);
  const usefulSuggestions = useMemo(() => getUsefulColumns(datasetInfo), [datasetInfo]);

  const getValidationError = (operation: string, config: OperationConfig) => {
    if (operation === 'rename') {
      if (!config.old_name) return 'Column name is required';
      if (!config.new_name) return 'New column name is required';
    }

    if (operation === 'drop' && !config.column) {
      return 'Column name is required';
    }

    if (operation === 'duplicate') {
      if (!config.source_column) return 'Column name is required';
      if (!config.new_column) return 'New column name is required';
    }

    if (operation === 'string') {
      // When applying string cleaning to *all* columns, `column` can be omitted.
      if (!config.column && !config.all_string_columns) return 'Column name is required';
      if (config.operation === 'replace' && !config.find) {
        return 'Find text is required';
      }
    }

    if (operation === 'numeric') {
      // numeric cleaning: either a column name or applyAll
      if (!config.column && !config.all_numeric_columns) return 'Column name is required';
      if (!config.mode) return 'Mode is required';
    }

    return null;
  };

  const handleOperation = async (operation: string, config: OperationConfig) => {
    // numeric operations are routed through the existing stringClean endpoint.
    // (Backend interprets `mode` and applies abs / make_positive.)
    if (!sessionId) {
      setMessage({ type: 'error', text: 'Please upload a dataset first' });
      return;
    }

    const validationError = getValidationError(operation, config);
    if (validationError) {
      setMessage({ type: 'error', text: validationError });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      let res;
      switch (operation) {
        case 'rename':
          res = await renameColumn(sessionId, config);
          break;
        case 'drop':
          res = await dropColumn(sessionId, config);
          break;
        case 'duplicate':
          res = await duplicateColumn(sessionId, config);
          break;
        case 'string':
          res = await stringClean(sessionId, config);
          break;
        case 'numeric':
          // numeric cleaning is handled by the backend string endpoint as well.
          res = await stringClean(sessionId, config);
          break;
        default:
          return;
      }
      await refreshDatasetInfo();
      if (res.pandas_code) setGeneratedCode(res.pandas_code);
      setMessage({ type: 'success', text: res.message || 'Operation completed' });
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setMessage({ type: 'error', text: errorMsg || 'Operation failed' });
    } finally {
      setLoading(false);
    }
  };

  if (!sessionId) {
    return (
      <div className="flex min-h-full items-center justify-center text-white/30">
        <div className="text-center">
          <ArrowLeftRight className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>Upload a dataset to transform</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold text-white mb-2">Data Transformation</h2>
        <p className="text-white/50 text-sm mb-6">Transform, reshape, and engineer your data</p>
      </motion.div>

      <div className="mb-6 glass-card border border-white/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Automatic suggestions</p>
            <p className="mt-1 text-sm text-text">
              {autoLoading
                ? 'Scanning the dataset for transformation matches...'
                : `${stringSuggestions.length + renameSuggestions.length + dropSuggestions.length} matched actions found`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] text-text-muted">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {textSuggestions.length} text columns
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {numericSuggestions.length} numeric columns
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {usefulSuggestions.length} general-purpose columns
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4 max-w-3xl">
        {sections.map((section) => {
          const Icon = section.icon;
          const isOpen = activeSection === section.id;
          return (
            <motion.div key={section.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden">
              <button onClick={() => setActiveSection(isOpen ? null : section.id)} className="w-full flex items-center justify-between p-4 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-secondary/20 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-secondary" />
                  </div>
                  <span className="text-sm font-semibold text-white">{section.label}</span>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-white/50" /> : <ChevronDown className="w-4 h-4 text-white/50" />}
              </button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <div className="px-4 pb-4 border-t border-white/10 pt-4">
                      {section.id === 'columns' && (
                        <ColumnOpsPanel
                          onApply={(op, cfg) => handleOperation(op, cfg)}
                          loading={loading}
                          renameSuggestions={renameSuggestions}
                          dropSuggestions={dropSuggestions}
                          usefulSuggestions={usefulSuggestions}
                        />
                      )}
                      {section.id === 'strings' && (
                        <StringOpsPanel
                          onApply={(op, cfg) => handleOperation(op, cfg)}
                          loading={loading}
                          suggestions={stringSuggestions}
                          textColumns={textSuggestions}
                          autoLoading={autoLoading}
                        />
                      )}
                      {section.id === 'numbers' && (
                        <NumericOpsPanel
                          onApply={(op, cfg) => handleOperation(op, cfg)}
                          loading={loading}
                          suggestions={numericSuggestions}
                          autoLoading={autoLoading}
                        />
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {message && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-4 p-4 rounded-2xl border flex items-center gap-2 ${message.type === 'success' ? 'bg-success/10 border-success/30 text-success' : 'bg-danger/10 border-danger/30 text-danger'}`}>
          {message.type === 'success' ? <Play className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span className="text-sm">{message.text}</span>
        </motion.div>
      )}
    </div>
  );
}

function ColumnOpsPanel({
  onApply,
  loading,
  renameSuggestions,
  dropSuggestions,
  usefulSuggestions,
}: {
  onApply: (op: string, cfg: OperationConfig) => void;
  loading: boolean;
  renameSuggestions: Array<{ column: string; detail: string; suggestedName?: string }>;
  dropSuggestions: Array<{ column: string; detail: string; suggestedName?: string }>;
  usefulSuggestions: Array<{ column: string; detail: string; suggestedName?: string }>;
}) {
  const [action, setAction] = useState<'rename' | 'drop' | 'duplicate'>('rename');
  const [col, setCol] = useState('');
  const [newName, setNewName] = useState('');
  const needsNewName = action === 'rename' || action === 'duplicate';
  const suggestions =
    action === 'rename'
      ? renameSuggestions
      : action === 'drop'
        ? dropSuggestions
        : usefulSuggestions;

  const handleApply = () => {
    const column = col.trim();
    const targetName = newName.trim();

    if (action === 'rename') {
      onApply('rename', { old_name: column, new_name: targetName });
      return;
    }

    if (action === 'duplicate') {
      onApply('duplicate', { source_column: column, new_column: targetName });
      return;
    }

    onApply('drop', { column });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Suggested columns
            </p>
            <p className="mt-1 text-sm text-text-muted">
              {action === 'rename'
                ? 'Columns with spaces or mixed casing are good rename targets.'
                : action === 'drop'
                  ? 'Columns with a single value or heavy missingness are safe drop candidates.'
                  : 'Well-populated columns are better to duplicate for new features.'}
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-text-muted">
            {suggestions.length} suggestions
          </span>
        </div>

        <div className="mt-3 space-y-2">
          {suggestions.length > 0 ? (
            suggestions.map((item: { column: string; detail: string; suggestedName?: string }) => (
              <button
                key={item.column}
                type="button"
                onClick={() => {
                  setCol(item.column);
                  if (action === 'rename') {
                    setNewName(item.suggestedName || normalizeColumnName(item.column));
                  } else if (action === 'duplicate') {
                    setNewName(`${normalizeColumnName(item.column)}_copy`);
                  }
                }}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-white/70 transition hover:border-secondary/30 hover:bg-secondary/10 hover:text-white"
              >
                <span className="min-w-0">
                  <span className="block font-medium text-white">{item.column}</span>
                  <span className="block truncate text-[11px] text-white/50">{item.detail}</span>
                </span>
                <span className="shrink-0 rounded-full border border-secondary/30 bg-secondary/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-secondary">
                  Fill
                </span>
              </button>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/5 px-3 py-3 text-xs text-white/40">
              No strong column suggestions were found for this action.
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {(['rename', 'drop', 'duplicate'] as const).map((a) => (
          <button key={a} onClick={() => setAction(a)} className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${action === a ? 'bg-secondary/30 border border-secondary/40 text-white' : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'}`}>
            {a === 'rename' ? 'Rename' : a === 'drop' ? 'Drop' : 'Duplicate'}
          </button>
        ))}
      </div>
      <input type="text" placeholder="Column name" value={col} onChange={(e) => setCol(e.target.value)} className="glass-input px-3 py-2 text-sm w-full" />
      {needsNewName && (
        <input
          type="text"
          placeholder={action === 'rename' ? 'New name' : 'Duplicate column name'}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="glass-input px-3 py-2 text-sm w-full"
        />
      )}
      <button onClick={handleApply} disabled={loading} className="glass-button px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
        {loading ? 'Processing...' : <><Play className="w-3.5 h-3.5" /> Apply</>}
      </button>
    </div>
  );
}




function NumericOpsPanel({
  onApply,
  loading,
  suggestions,
  autoLoading,
}: {
  onApply: (op: string, cfg: OperationConfig) => void;
  loading: boolean;
  suggestions: Array<{ column: string; detail: string }>;
  autoLoading: boolean;
}) {
  const [column, setColumn] = useState('');
  const [applyAll, setApplyAll] = useState(false);
  const [mode, setMode] = useState<'abs' | 'make_positive'>('make_positive');

  const handleApply = () => {
    if (applyAll) {
      onApply('numeric', {
        all_numeric_columns: 'true',
        mode,
      });
      return;
    }

    onApply('numeric', {
      column: column.trim(),
      mode,
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Suggested numeric columns</p>
            <p className="mt-1 text-sm text-text-muted">
              {autoLoading ? 'Scanning numeric columns...' : 'Pick a numeric column or apply the operation to all numeric columns.'}
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-text-muted">
            {suggestions.length} suggestions
          </span>
        </div>

        {!applyAll && (
          <div className="mt-3">
            <select
              value={column}
              onChange={(e) => setColumn(e.target.value)}
              className="glass-input w-full px-3 py-2 text-sm"
            >
              <option value="">Choose a suggested numeric column</option>
              {suggestions.map((item: { column: string; detail: string; suggestedName?: string }) => (
                <option key={item.column} value={item.column}>
                  {item.column} - {item.detail}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
        <input
          type="checkbox"
          checked={applyAll}
          onChange={(e) => setApplyAll(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-white/20 text-primary focus:ring-primary"
        />
        <span>
          Convert negative numbers to positive in <b>all numeric columns</b>
        </span>
      </label>

      {!applyAll && (
        <input
          type="text"
          placeholder="Column name"
          value={column}
          onChange={(e) => setColumn(e.target.value)}
          className="glass-input px-3 py-2 text-sm w-full"
        />
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode('make_positive')}
          className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${mode === 'make_positive' ? 'bg-secondary/30 border border-secondary/40 text-white' : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'}`}
        >
          Convert negatives to positive
        </button>
        <button
          type="button"
          onClick={() => setMode('abs')}
          className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${mode === 'abs' ? 'bg-secondary/30 border border-secondary/40 text-white' : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'}`}
        >
          Use absolute value (abs)
        </button>
      </div>

      <button
        type="button"
        onClick={handleApply}
        disabled={loading}
        className="glass-button px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50"
      >
        {loading ? 'Processing...' : <><Play className="w-3.5 h-3.5" /> Apply</>}
      </button>
    </div>
  );
}

function StringOpsPanel({
  onApply,
  loading,
  suggestions,
  textColumns,
  autoLoading,
}: {
  onApply: (op: string, cfg: OperationConfig) => void;
  loading: boolean;
  suggestions: AutoDetectRecommendation[];
  textColumns: Array<{ column: string; detail: string }>;
  autoLoading: boolean;
}) {
  const [col, setCol] = useState('');
  const [applyAllStringCols, setApplyAllStringCols] = useState(false);
  const [operation, setOperation] = useState('lowercase');
  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');


  const ops = [
    { id: 'lowercase', label: 'Lowercase' },
    { id: 'uppercase', label: 'Uppercase' },
    { id: 'title', label: 'Title Case' },
    { id: 'trim', label: 'Trim Spaces' },
    { id: 'replace', label: 'Replace Text' },
  ];

  const handleApply = () => {
    const baseConfig: OperationConfig = {
      operation,
      find: find.trim(),
      replace,
    };

    if (applyAllStringCols) {
      onApply('string', {
        ...baseConfig,
        all_string_columns: 'true',
      });
      return;
    }

    onApply('string', {
      ...baseConfig,
      column: col.trim(),
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Auto-detected string fixes</p>
            <p className="mt-1 text-sm text-text-muted">
              {autoLoading ? 'Scanning for text cleanup opportunities...' : 'Detected string cleanup fixes can be applied directly.'}
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-text-muted">
            {suggestions.length} suggestions
          </span>
        </div>

        <div className="mt-3 space-y-2">
          {suggestions.length > 0 ? (
            suggestions.map((item: AutoDetectRecommendation) => {
              const columnName = getRecommendationColumns(item)[0] || '';
              const targetOperation = (item.config.operation as string) || 'trim';
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onApply('string', item.config as OperationConfig)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-white/70 transition hover:border-primary/30 hover:bg-primary/10 hover:text-white"
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-white">{columnName}</span>
                    <span className="block truncate text-[11px] text-white/50">
                      {targetOperation} | {item.description}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-primary">
                    Apply
                  </span>
                </button>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/5 px-3 py-3 text-xs text-white/40">
              No automatic string-cleaning fix was detected.
            </div>
          )}
        </div>
      </div>

      <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
        <input
          type="checkbox"
          checked={applyAllStringCols}
          onChange={(e) => setApplyAllStringCols(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-white/20 text-primary focus:ring-primary"
        />
        <span>
          Apply string cleaning to <b>all columns</b> containing text (string/object columns)
        </span>
      </label>

      {!applyAllStringCols && (
        <div className="space-y-2">
          {textColumns.length > 0 && (
            <select
              value={col}
              onChange={(e) => setCol(e.target.value)}
              className="glass-input w-full px-3 py-2 text-sm"
            >
              <option value="">Choose a suggested text column</option>
              {textColumns.map((item: ColumnSuggestion) => (
                <option key={item.column} value={item.column}>
                  {item.column} - {item.detail}
                </option>
              ))}
            </select>
          )}
          <input
            type="text"
            placeholder="Column name"
            value={col}
            onChange={(e) => setCol(e.target.value)}
            className="glass-input px-3 py-2 text-sm w-full"
          />
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {ops.map((o) => (
          <button key={o.id} onClick={() => setOperation(o.id)} className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${operation === o.id ? 'bg-secondary/30 border border-secondary/40 text-white' : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'}`}>
            {o.label}
          </button>
        ))}
      </div>
      {operation === 'replace' && (
        <>
          <input
            type="text"
            placeholder="Find"
            value={find}
            onChange={(e) => setFind(e.target.value)}
            className="glass-input px-3 py-2 text-sm w-full"
          />
          {operation === 'replace' && (
            <input type="text" placeholder="Replace with" value={replace} onChange={(e) => setReplace(e.target.value)} className="glass-input px-3 py-2 text-sm w-full" />
          )}
        </>
      )}
      <button onClick={handleApply} disabled={loading} className="glass-button px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
        {loading ? 'Processing...' : <><Play className="w-3.5 h-3.5" /> Apply</>}
      </button>
    </div>
  );
}
