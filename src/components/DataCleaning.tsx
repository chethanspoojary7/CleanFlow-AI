/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Copy,
  Droplets,
  Play,
  Target,
  Type,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  cleanDuplicates,
  cleanMissing,
  cleanOutliers,
  convertType,
  getAutoDetect,
  mapValues,
} from '../services/api';
import type { AutoDetectRecommendation } from '../types';
import {
  type ColumnSuggestion,
  getAutoDetectRecommendations,
  getCategoricalColumns,
  getNumericColumns,
  getRecommendationColumns,
  getTextColumns,
} from '../utils/columnSuggestions';

const sections = [
  { id: 'missing', label: 'Missing values', icon: Droplets, blurb: 'Fill blanks or remove incomplete rows' },
  { id: 'duplicates', label: 'Duplicate rows', icon: Copy, blurb: 'Remove repeated records cleanly' },
  { id: 'values', label: 'Value mapping', icon: Target, blurb: 'Standardize labels like F and m' },
  { id: 'types', label: 'Type conversion', icon: Type, blurb: 'Convert age-like strings to integers' },
  { id: 'outliers', label: 'Outlier detection', icon: AlertTriangle, blurb: 'Detect and handle numeric outliers' },
];

const parseMappingText = (text: string) => {
  const mapping: Record<string, string> = {};

  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const separatorIndex = trimmed.includes(':')
      ? trimmed.indexOf(':')
      : trimmed.includes('=')
        ? trimmed.indexOf('=')
        : -1;

    if (separatorIndex === -1) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key && value) {
      mapping[key] = value;
    }
  });

  return mapping;
};

export default function DataCleaning() {
  const { sessionId, datasetInfo, datasetName, refreshDatasetInfo, setGeneratedCode } = useApp();
  const [activeSection, setActiveSection] = useState<string | null>('missing');
  const [loading, setLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoRecommendations, setAutoRecommendations] = useState<AutoDetectRecommendation[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [missingStrategy, setMissingStrategy] = useState('mean');
  const [customValue, setCustomValue] = useState('');

  const [keep, setKeep] = useState('first');

  const [mappingColumn, setMappingColumn] = useState('');
  const [mappingText, setMappingText] = useState('F: female\nM: male');
  const [caseInsensitive, setCaseInsensitive] = useState(true);
  const [trimWhitespace, setTrimWhitespace] = useState(true);

  const [typeColumn, setTypeColumn] = useState('');
  const [newType, setNewType] = useState('int64');
  const [stripText, setStripText] = useState(true);

  const [outlierMethod, setOutlierMethod] = useState('iqr');
  const [outlierColumn, setOutlierColumn] = useState('');
  const [outlierAction, setOutlierAction] = useState('remove');

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

  const missingSuggestions = useMemo(
    () => getAutoDetectRecommendations(autoRecommendations, 'missing'),
    [autoRecommendations]
  );
  const duplicateSuggestion = useMemo(
    () => getAutoDetectRecommendations(autoRecommendations, 'duplicates')[0] || null,
    [autoRecommendations]
  );
  const typeSuggestions = useMemo(
    () => getAutoDetectRecommendations(autoRecommendations, 'convert_type'),
    [autoRecommendations]
  );
  const outlierSuggestions = useMemo(
    () => getAutoDetectRecommendations(autoRecommendations, 'outliers'),
    [autoRecommendations]
  );
  const stringSuggestions = useMemo(
    () =>
      getAutoDetectRecommendations(autoRecommendations, 'string_clean').filter(
        (item) => item.config.operation !== 'extract'
      ),
    [autoRecommendations]
  );
  const mappingSuggestions = useMemo(
    () => getCategoricalColumns(datasetInfo),
    [datasetInfo]
  );
  const numericSuggestions = useMemo(
    () => getNumericColumns(datasetInfo),
    [datasetInfo]
  );
  const textSuggestions = useMemo(
    () => getTextColumns(datasetInfo),
    [datasetInfo]
  );

  const handleOperation = async (operation: string, config: Record<string, unknown>) => {
    if (!sessionId) {
      setMessage({ type: 'error', text: 'Please upload a dataset first' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      let res: { message?: string; pandas_code?: string } = {};

      switch (operation) {
        case 'missing':
          res = await cleanMissing(sessionId, config);
          break;
        case 'duplicates':
          res = await cleanDuplicates(sessionId, config);
          break;
        case 'values':
          res = await mapValues(sessionId, config);
          break;
        case 'types':
          res = await convertType(sessionId, config);
          break;
        case 'outliers':
          res = await cleanOutliers(sessionId, config);
          break;
        default:
          return;
      }

      await refreshDatasetInfo();
      if (res.pandas_code) setGeneratedCode(res.pandas_code);
      setMessage({ type: 'success', text: res.message || 'Operation completed successfully' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.error || 'Operation failed' });
    } finally {
      setLoading(false);
    }
  };

  const applyValueMapping = () => {
    const mapping = parseMappingText(mappingText);
    if (Object.keys(mapping).length === 0) {
      setMessage({ type: 'error', text: 'Add at least one mapping pair like F: female' });
      return;
    }

    handleOperation('values', {
      column: mappingColumn.trim(),
      mapping,
      case_insensitive: caseInsensitive,
      trim_whitespace: trimWhitespace,
    });
  };

  if (!sessionId) {
    return (
      <div className="flex min-h-full items-center justify-center text-text-muted">
        <div className="text-center">
          <Droplets className="mx-auto mb-3 h-10 w-10 opacity-50" />
          <p>Upload a dataset to start cleaning</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Data cleaning</p>
        <h2 className="mt-2 text-3xl font-semibold text-text">Clean, map, and convert fields</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-text-muted">
          Standardize values like `F` and `m`, convert age columns from strings to integers, and handle missing data in a layout built for quick scanning.
        </p>
      </motion.div>

      <div className="mt-6 glass-card border border-white/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Automatic suggestions</p>
            <p className="mt-1 text-sm text-text">
              {autoLoading
                ? 'Scanning the dataset for matching cleaning actions...'
                : `${missingSuggestions.length + typeSuggestions.length + outlierSuggestions.length + stringSuggestions.length} matched actions found`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] text-text-muted">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {mappingSuggestions.length} text columns
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {numericSuggestions.length} numeric columns
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {textSuggestions.length} text-like columns
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
        <div className="space-y-4">
          {sections.map((section) => {
            const Icon = section.icon;
            const isOpen = activeSection === section.id;

            return (
              <motion.article
                key={section.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setActiveSection(isOpen ? null : section.id)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-text">{section.label}</h3>
                      <p className="text-xs text-text-muted">{section.blurb}</p>
                    </div>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-text-muted" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-text-muted" />
                  )}
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-white/10 p-5">
                        {section.id === 'missing' && (
                          <MissingValuesPanel
                            strategy={missingStrategy}
                            setStrategy={setMissingStrategy}
                            customValue={customValue}
                            setCustomValue={setCustomValue}
                            suggestions={missingSuggestions}
                            onApplySuggestion={(recommendation: AutoDetectRecommendation) => {
                              const nextStrategy = recommendation.config.strategy;
                              if (typeof nextStrategy === 'string') {
                                setMissingStrategy(nextStrategy);
                              }
                              handleOperation('missing', recommendation.config);
                            }}
                            onApply={() =>
                              handleOperation('missing', {
                                strategy: missingStrategy,
                                custom_value: customValue || undefined,
                              })
                            }
                            loading={loading}
                            autoLoading={autoLoading}
                          />
                        )}

                        {section.id === 'duplicates' && (
                          <DuplicatesPanel
                            keep={keep}
                            setKeep={setKeep}
                            suggestion={duplicateSuggestion}
                            onApplySuggestion={() =>
                              handleOperation('duplicates', {
                                keep: duplicateSuggestion?.config.keep || 'first',
                              })
                            }
                            onApply={() =>
                              handleOperation('duplicates', {
                                keep,
                              })
                            }
                            loading={loading}
                          />
                        )}

                        {section.id === 'values' && (
                          <ValueMappingPanel
                            column={mappingColumn}
                            setColumn={setMappingColumn}
                            mappingText={mappingText}
                            setMappingText={setMappingText}
                            caseInsensitive={caseInsensitive}
                            setCaseInsensitive={setCaseInsensitive}
                            trimWhitespace={trimWhitespace}
                            setTrimWhitespace={setTrimWhitespace}
                            suggestions={mappingSuggestions}
                            onApply={applyValueMapping}
                            loading={loading}
                          />
                        )}

                        {section.id === 'types' && (
                          <TypeConversionPanel
                            column={typeColumn}
                            setColumn={setTypeColumn}
                            newType={newType}
                            setNewType={setNewType}
                            stripText={stripText}
                            setStripText={setStripText}
                            suggestions={typeSuggestions}
                            onApplySuggestion={(recommendation: AutoDetectRecommendation) => {
                              const suggestionColumn = getRecommendationColumns(recommendation)[0] || '';
                              if (suggestionColumn) setTypeColumn(suggestionColumn);

                              const targetType = recommendation.config.new_type;
                              if (typeof targetType === 'string') {
                                setNewType(targetType);
                              }

                              const targetStripText = recommendation.config.strip_text;
                              if (typeof targetStripText === 'boolean') {
                                setStripText(targetStripText);
                              }

                              handleOperation('types', recommendation.config);
                            }}
                            onApply={() =>
                              handleOperation('types', {
                                column: typeColumn.trim(),
                                new_type: newType,
                                strip_text: stripText,
                              })
                            }
                            loading={loading}
                            autoLoading={autoLoading}
                          />
                        )}

                        {section.id === 'outliers' && (
                          <OutliersPanel
                            method={outlierMethod}
                            setMethod={setOutlierMethod}
                            column={outlierColumn}
                            setColumn={setOutlierColumn}
                            action={outlierAction}
                            setAction={setOutlierAction}
                            suggestions={outlierSuggestions}
                            onApplySuggestion={(recommendation: AutoDetectRecommendation) => {
                              const suggestionColumn = getRecommendationColumns(recommendation)[0] || '';
                              if (suggestionColumn) setOutlierColumn(suggestionColumn);

                              const targetMethod = recommendation.config.method;
                              if (typeof targetMethod === 'string') {
                                setOutlierMethod(targetMethod);
                              }

                              const targetAction = recommendation.config.action;
                              if (typeof targetAction === 'string') {
                                setOutlierAction(targetAction);
                              }

                              handleOperation('outliers', recommendation.config);
                            }}
                            onApply={() =>
                              handleOperation('outliers', {
                                method: outlierMethod,
                                column: outlierColumn.trim(),
                                action: outlierAction,
                              })
                            }
                            loading={loading}
                            autoLoading={autoLoading}
                          />
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.article>
            );
          })}

          {message && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${
                message.type === 'success'
                  ? 'border-success/25 bg-success/10 text-success'
                  : 'border-danger/25 bg-danger/10 text-danger'
              }`}
            >
              <Play className="h-4 w-4" />
              <span>{message.text}</span>
            </motion.div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="glass-card sticky top-6 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Current dataset</p>
            <h3 className="mt-3 text-base font-semibold text-text">{datasetName || 'Dataset loaded'}</h3>

            {datasetInfo ? (
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <Metric label="Rows" value={datasetInfo.rows.toLocaleString()} />
                <Metric label="Columns" value={datasetInfo.columns.toString()} />
                <Metric label="Missing" value={datasetInfo.missing_values.toString()} />
                <Metric label="Duplicates" value={datasetInfo.duplicate_rows.toString()} />
              </div>
            ) : (
              <p className="mt-4 text-sm text-text-muted">No dataset metadata available yet.</p>
            )}

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">Recommended flow</p>
              <ol className="mt-3 space-y-2 text-sm text-white/60">
                <li>1. Standardize labels in Value Mapping.</li>
                <li>2. Convert age columns with text stripping enabled.</li>
                <li>3. Handle missing values or duplicates last.</li>
              </ol>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card p-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function MissingValuesPanel({
  strategy,
  setStrategy,
  customValue,
  setCustomValue,
  suggestions,
  onApplySuggestion,
  onApply,
  loading,
  autoLoading,
}: any) {
  const strategies = [
    { id: 'mean', label: 'Mean' },
    { id: 'median', label: 'Median' },
    { id: 'mode', label: 'Mode' },
    { id: 'ffill', label: 'Forward fill' },
    { id: 'bfill', label: 'Backward fill' },
    { id: 'custom', label: 'Custom value' },
    { id: 'drop_rows', label: 'Drop rows' },
    { id: 'drop_columns', label: 'Drop columns' },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Auto-detected fixes</p>
            <p className="mt-1 text-sm text-text-muted">
              {autoLoading ? 'Scanning for missing-value matches...' : 'Recommended columns and strategies based on the dataset.'}
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-text-muted">
            {suggestions.length} suggestions
          </span>
        </div>

        <div className="mt-3 space-y-2">
          {suggestions.length > 0 ? (
            suggestions.map((item: AutoDetectRecommendation) => {
              const columns = getRecommendationColumns(item);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onApplySuggestion(item)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-white/70 transition hover:border-primary/30 hover:bg-primary/10 hover:text-white"
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-white">{item.title}</span>
                    <span className="block truncate text-[11px] text-white/50">
                      {columns.join(', ')} | {item.config.strategy as string}
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
              No automatic missing-value fix was detected.
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {strategies.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setStrategy(item.id)}
            className={`rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
              strategy === item.id
                ? 'border-primary/25 bg-primary/10 text-primary'
                : 'border-white/10 bg-white/5 text-white/60 hover:border-primary/20 hover:bg-white/10 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {strategy === 'custom' && (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Custom value</label>
            <input
              type="text"
              placeholder="0"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              className="glass-input w-full px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onApply}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Play className="h-4 w-4" />
        {loading ? 'Processing...' : 'Apply'}
      </button>
    </div>
  );
}

function DuplicatesPanel({ keep, setKeep, suggestion, onApplySuggestion, onApply, loading }: any) {
  return (
    <div className="space-y-4">
      {suggestion && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Auto suggestion</p>
              <p className="mt-1 text-sm text-text">
                {suggestion.title} - keep the first occurrence is usually the safest default.
              </p>
            </div>
            <button
              type="button"
              onClick={onApplySuggestion}
              className="rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-medium text-primary transition hover:bg-primary/20"
            >
              Apply suggested
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Keep</label>
          <select
            value={keep}
            onChange={(e) => setKeep(e.target.value)}
            className="glass-input w-full px-3 py-2 text-sm"
          >
            <option value="first">First occurrence</option>
            <option value="last">Last occurrence</option>
            <option value="false">Remove all duplicates</option>
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={onApply}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Play className="h-4 w-4" />
        {loading ? 'Processing...' : 'Remove duplicates'}
      </button>
    </div>
  );
}

function ValueMappingPanel({
  column,
  setColumn,
  mappingText,
  setMappingText,
  caseInsensitive,
  setCaseInsensitive,
  trimWhitespace,
  setTrimWhitespace,
  suggestions,
  onApply,
  loading,
}: any) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Column name</label>
          {suggestions.length > 0 && (
            <select
              value={column}
              onChange={(e) => setColumn(e.target.value)}
              className="mb-2 glass-input w-full px-3 py-2 text-sm"
            >
              <option value="">Choose a suggested text column</option>
              {suggestions.map((item: ColumnSuggestion) => (
                <option key={item.column} value={item.column}>
                  {item.column} - {item.detail}
                </option>
              ))}
            </select>
          )}
          <input
            type="text"
            placeholder="gender"
            value={column}
            onChange={(e) => setColumn(e.target.value)}
            className="glass-input w-full px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-text-muted">
            Suggested columns are low-cardinality text fields, which usually fit value mapping best.
          </p>
        </div>
        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <label className="flex items-center gap-3 text-sm text-white/80">
            <input
              type="checkbox"
              checked={caseInsensitive}
              onChange={(e) => setCaseInsensitive(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 text-primary focus:ring-primary"
            />
            Case-insensitive matching
          </label>
          <label className="flex items-center gap-3 text-sm text-white/80">
            <input
              type="checkbox"
              checked={trimWhitespace}
              onChange={(e) => setTrimWhitespace(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 text-primary focus:ring-primary"
            />
            Trim whitespace before matching
          </label>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-text-muted">Mappings</label>
        <textarea
          rows={6}
          value={mappingText}
          onChange={(e) => setMappingText(e.target.value)}
          className="glass-input w-full px-3 py-2 text-sm"
          placeholder={"F: female\nm: male"}
        />
        <p className="mt-1 text-xs text-text-muted">Use one mapping per line in the form `from: to` or `from = to`.</p>
      </div>

      <button
        type="button"
        onClick={onApply}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Target className="h-4 w-4" />
        {loading ? 'Processing...' : 'Standardize values'}
      </button>
    </div>
  );
}

function TypeConversionPanel({
  column,
  setColumn,
  newType,
  setNewType,
  stripText,
  setStripText,
  suggestions,
  onApplySuggestion,
  onApply,
  loading,
  autoLoading,
}: any) {
  const types = ['int64', 'float64', 'str', 'bool', 'category', 'datetime64[ns]'];
  const showStripText = newType === 'int64';

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Auto-detected conversions</p>
            <p className="mt-1 text-sm text-text-muted">
              {autoLoading ? 'Scanning for likely type fixes...' : 'Columns that look like numeric text are suggested here.'}
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-text-muted">
            {suggestions.length} suggestions
          </span>
        </div>

        <div className="mt-3 space-y-2">
          {suggestions.length > 0 ? (
            suggestions.map((item: AutoDetectRecommendation) => {
              const suggestionColumn = getRecommendationColumns(item)[0] || '';
              const targetType = (item.config.new_type as string) || 'float64';
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onApplySuggestion(item)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-white/70 transition hover:border-secondary/30 hover:bg-secondary/10 hover:text-white"
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-white">{suggestionColumn}</span>
                    <span className="block truncate text-[11px] text-white/50">
                      Convert to {targetType}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full border border-secondary/30 bg-secondary/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-secondary">
                    Apply
                  </span>
                </button>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/5 px-3 py-3 text-xs text-white/40">
              No automatic type conversion was detected.
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Column name</label>
          {suggestions.length > 0 && (
            <select
              value={column}
              onChange={(e) => setColumn(e.target.value)}
              className="mb-2 glass-input w-full px-3 py-2 text-sm"
            >
              <option value="">Choose a suggested column</option>
              {suggestions.map((item: AutoDetectRecommendation) => {
                const suggestionColumn = getRecommendationColumns(item)[0] || '';
                const targetType = (item.config.new_type as string) || 'float64';
                return (
                  <option key={item.id} value={suggestionColumn}>
                    {suggestionColumn} - {targetType}
                  </option>
                );
              })}
            </select>
          )}
          <input
            type="text"
            placeholder="age"
            value={column}
            onChange={(e) => setColumn(e.target.value)}
            className="glass-input w-full px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Target type</label>
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            className="glass-input w-full px-3 py-2 text-sm"
          >
            {types.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showStripText && (
        <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
          <input
            type="checkbox"
            checked={stripText}
            onChange={(e) => setStripText(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-white/20 text-primary focus:ring-primary"
          />
          <span>
            Strip text before converting. Use this for age columns so values like `24 years` or `Age: 24` become integers.
          </span>
        </label>
      )}

      <button
        type="button"
        onClick={onApply}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Play className="h-4 w-4" />
        {loading ? 'Processing...' : 'Convert type'}
      </button>
    </div>
  );
}

function OutliersPanel({
  method,
  setMethod,
  column,
  setColumn,
  action,
  setAction,
  suggestions,
  onApplySuggestion,
  onApply,
  loading,
  autoLoading,
}: any) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Auto-detected outliers</p>
            <p className="mt-1 text-sm text-text-muted">
              {autoLoading ? 'Scanning numeric columns for outliers...' : 'Numeric columns with likely outliers are listed here.'}
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-text-muted">
            {suggestions.length} suggestions
          </span>
        </div>

        <div className="mt-3 space-y-2">
          {suggestions.length > 0 ? (
            suggestions.map((item: AutoDetectRecommendation) => {
              const suggestionColumn = getRecommendationColumns(item)[0] || '';
              const targetAction = (item.config.action as string | undefined) || 'remove';
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onApplySuggestion(item)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-white/70 transition hover:border-warning/30 hover:bg-warning/10 hover:text-white"
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-white">{suggestionColumn}</span>
                    <span className="block truncate text-[11px] text-white/50">
                      {(item.config.method as string) || method} | {targetAction}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-warning">
                    Apply
                  </span>
                </button>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/5 px-3 py-3 text-xs text-white/40">
              No automatic outlier fix was detected.
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Detection method</label>
          {suggestions.length > 0 && (
            <select
              value={column}
              onChange={(e) => setColumn(e.target.value)}
              className="mb-2 glass-input w-full px-3 py-2 text-sm"
            >
              <option value="">Choose a suggested numeric column</option>
              {suggestions.map((item: AutoDetectRecommendation) => {
                const suggestionColumn = getRecommendationColumns(item)[0] || '';
                return (
                  <option key={item.id} value={suggestionColumn}>
                    {suggestionColumn}
                  </option>
                );
              })}
            </select>
          )}
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="glass-input w-full px-3 py-2 text-sm"
          >
            <option value="iqr">IQR</option>
            <option value="zscore">Z-Score</option>
            <option value="isolation_forest">Isolation Forest</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Column name</label>
          <input
            type="text"
            placeholder="numeric_column"
            value={column}
            onChange={(e) => setColumn(e.target.value)}
            className="glass-input w-full px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-text-muted">Action</label>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="glass-input w-full px-3 py-2 text-sm"
        >
          <option value="remove">Remove outliers</option>
          <option value="clip">Clip to bounds</option>
          <option value="flag">Flag only</option>
        </select>
      </div>

      <button
        type="button"
        onClick={onApply}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Play className="h-4 w-4" />
        {loading ? 'Processing...' : 'Detect and handle'}
      </button>
    </div>
  );
}
