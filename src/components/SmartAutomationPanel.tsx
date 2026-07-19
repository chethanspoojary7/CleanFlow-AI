import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckSquare,
  Loader2,
  Play,
  RefreshCw,
  Square,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import {
  cleanDuplicates,
  cleanMissing,
  cleanOutliers,
  convertType,
  getAutoDetect,
  stringClean,
} from '../services/api';
import type { AutoDetectRecommendation } from '../types';

const getErrorMessage = (err: unknown, fallback: string) => {
  const response = err as { response?: { data?: { error?: string } } };
  return response.response?.data?.error || fallback;
};

const describeTarget = (recommendation: AutoDetectRecommendation) => {
  const config = recommendation.config || {};

  if (Array.isArray(config.columns) && config.columns.length > 0) {
    return `Columns: ${config.columns.slice(0, 2).join(', ')}${config.columns.length > 2 ? ' +' : ''}`;
  }

  if (typeof config.column === 'string' && config.column) {
    return `Column: ${config.column}`;
  }

  if (typeof config.method === 'string' && config.method) {
    return `Method: ${config.method}`;
  }

  if (typeof config.new_type === 'string' && config.new_type) {
    return `Type: ${config.new_type}`;
  }

  return 'Auto detected';
};

export default function SmartAutomationPanel() {
  const { sessionId, datasetInfo, refreshDatasetInfo, setGeneratedCode } = useApp();
  const [recommendations, setRecommendations] = useState<AutoDetectRecommendation[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [applying, setApplying] = useState(false);
  const [status, setStatus] = useState<string>('Scan the dataset to find safe fixes.');

  const selectDefaults = useCallback((items: AutoDetectRecommendation[]) => {
    return new Set(items.filter((item) => item.auto_applicable).map((item) => item.id));
  }, []);

  const loadRecommendations = useCallback(async () => {
    if (!sessionId) return;

    setScanning(true);
    try {
      const res = await getAutoDetect(sessionId);
      const nextRecommendations = res.recommendations || [];
      setRecommendations(nextRecommendations);
      setSelectedIds(selectDefaults(nextRecommendations));
      setStatus(
        nextRecommendations.length > 0
          ? `${nextRecommendations.length} recommendation${nextRecommendations.length === 1 ? '' : 's'} found.`
          : 'No automatic fixes detected.'
      );
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Unable to scan the dataset');
      setStatus(message);
      toast.error(message);
    } finally {
      setScanning(false);
    }
  }, [selectDefaults, sessionId]);

  useEffect(() => {
    void loadRecommendations();
  }, [loadRecommendations, datasetInfo]);

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const executeRecommendation = async (recommendation: AutoDetectRecommendation) => {
    if (!sessionId) {
      throw new Error('No active dataset session');
    }

    switch (recommendation.operation) {
      case 'missing':
        return cleanMissing(sessionId, recommendation.config);
      case 'duplicates':
        return cleanDuplicates(sessionId, recommendation.config);
      case 'convert_type':
        return convertType(sessionId, recommendation.config);
      case 'string_clean':
        return stringClean(sessionId, recommendation.config);
      case 'outliers':
        return cleanOutliers(sessionId, recommendation.config);
      default:
        throw new Error(`Unsupported recommendation: ${recommendation.operation}`);
    }
  };

  const handleApplySelected = async () => {
    if (!sessionId) return;

    const targets = recommendations.filter((item) => selectedIds.has(item.id));
    if (targets.length === 0) {
      toast.error('Select at least one recommendation to apply');
      return;
    }

    setApplying(true);
    try {
      const codeSnippets: string[] = [];
      const appliedTitles: string[] = [];
      const skippedTitles: string[] = [];

      for (const recommendation of targets) {
        try {
          const result = await executeRecommendation(recommendation);
          appliedTitles.push(recommendation.title);
          if (result?.pandas_code) {
            codeSnippets.push(`# ${recommendation.title}\n${result.pandas_code}`);
          }
        } catch (err: unknown) {
          skippedTitles.push(`${recommendation.title}: ${getErrorMessage(err, 'failed')}`);
        }
      }

      await refreshDatasetInfo();
      if (codeSnippets.length > 0) {
        setGeneratedCode(codeSnippets.join('\n\n'));
      }

      if (appliedTitles.length > 0) {
        toast.success(`Applied ${appliedTitles.length} recommendation${appliedTitles.length === 1 ? '' : 's'}`);
      }

      if (skippedTitles.length > 0) {
        toast.error(`${skippedTitles.length} recommendation${skippedTitles.length === 1 ? '' : 's'} skipped`);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Automatic application failed'));
    } finally {
      setApplying(false);
    }
  };

  if (!sessionId) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden"
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            Smart automation
          </p>
          <p className="mt-1 text-sm text-text">Detect likely fixes and apply the selected ones.</p>
        </div>

        <button
          type="button"
          onClick={() => void loadRecommendations()}
          disabled={scanning || applying}
          className="inline-flex items-center gap-2 rounded-lg glass-button px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Scan
        </button>
      </div>

      <div className="space-y-3 p-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60">
          {status}
        </div>

        {recommendations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-white/40">
            {scanning ? 'Scanning dataset...' : 'No automatic fixes detected yet.'}
          </div>
        ) : (
          <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
            {recommendations.map((recommendation) => {
              const selected = selectedIds.has(recommendation.id);
              return (
                <button
                  key={recommendation.id}
                  type="button"
                  onClick={() => toggleSelected(recommendation.id)}
                  className={`w-full rounded-2xl border p-3 text-left transition ${
                    selected
                      ? 'border-primary/30 bg-primary/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {selected ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4 text-white/40" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-white">{recommendation.title}</p>
                          <p className="mt-1 text-[11px] leading-4 text-white/60">
                            {recommendation.description}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${
                            recommendation.auto_applicable
                              ? 'border-success/30 bg-success/10 text-success'
                              : 'border-warning/30 bg-warning/10 text-warning'
                          }`}
                        >
                          {recommendation.auto_applicable ? 'Safe' : 'Review'}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/50">
                          {recommendation.category}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/50">
                          {recommendation.operation}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/50">
                          {describeTarget(recommendation)}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
          <p className="text-[11px] text-white/50">
            {selectedIds.size} selected | {recommendations.filter((item) => item.auto_applicable).length} safe by default
          </p>

          <button
            type="button"
            onClick={() => void handleApplySelected()}
            disabled={applying || scanning || selectedIds.size === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Apply selected
          </button>
        </div>

        {recommendations.some((item) => !item.auto_applicable) && (
          <div className="flex items-start gap-2 rounded-2xl border border-warning/20 bg-warning/10 px-3 py-2 text-[11px] text-warning">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Manual suggestions stay selectable, but review them before applying.
          </div>
        )}
      </div>
    </motion.section>
  );
}
