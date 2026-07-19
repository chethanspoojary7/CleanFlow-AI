import type { AutoDetectRecommendation, DatasetInfo } from '../types';

export interface ColumnSuggestion {
  column: string;
  detail: string;
  suggestedName?: string;
}

const normalizeName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const getColumnEntries = (info: DatasetInfo | null) => {
  if (!info) return [];
  return Object.entries(info.column_stats || {}).map(([column, stats]) => ({
    column,
    stats,
    dtype: info.dtypes?.[column] || stats.type || '',
  }));
};

const isNumericDtype = (dtype: string) =>
  /int|float|double|decimal|number|numeric|int64|int32|float64|float32/i.test(dtype);

const isTextDtype = (dtype: string) =>
  /object|string|category|text/i.test(dtype);

export const getNumericColumns = (info: DatasetInfo | null): ColumnSuggestion[] =>
  getColumnEntries(info)
    .filter(({ dtype }) => isNumericDtype(dtype))
    .sort((a, b) => a.stats.missing - b.stats.missing || a.stats.unique - b.stats.unique)
    .map(({ column, stats }) => ({
      column,
      detail: `${stats.unique} unique values`,
    }));

export const getTextColumns = (info: DatasetInfo | null): ColumnSuggestion[] =>
  getColumnEntries(info)
    .filter(({ dtype }) => isTextDtype(dtype))
    .sort((a, b) => a.stats.missing - b.stats.missing || a.stats.unique - b.stats.unique)
    .map(({ column, stats }) => ({
      column,
      detail: `${stats.unique} unique text values`,
    }));

export const getCategoricalColumns = (info: DatasetInfo | null): ColumnSuggestion[] => {
  if (!info || !info.rows) return [];

  const rowCount = Math.max(info.rows, 1);
  return getColumnEntries(info)
    .filter(({ dtype }) => isTextDtype(dtype))
    .filter(({ stats }) => {
      const uniqueRatio = stats.unique / rowCount;
      return stats.unique <= Math.min(25, Math.max(5, rowCount * 0.35)) || uniqueRatio <= 0.35;
    })
    .sort((a, b) => a.stats.unique - b.stats.unique || a.stats.missing - b.stats.missing)
    .map(({ column, stats }) => ({
      column,
      detail: `${stats.unique} categories`,
    }));
};

export const getRenameSuggestions = (info: DatasetInfo | null, limit = 5): ColumnSuggestion[] =>
  getColumnEntries(info)
    .flatMap(({ column }) => {
      const suggestedName = normalizeName(column);
      const needsRename =
        suggestedName !== column ||
        /\s/.test(column) ||
        /[^a-zA-Z0-9_]/.test(column) ||
        /[A-Z]/.test(column);

      return needsRename
        ? [
            {
              column,
              detail: `Rename to ${suggestedName || 'column_name'}`,
              suggestedName: suggestedName || 'column_name',
            },
          ]
        : [];
    })
    .slice(0, limit);

export const getDropSuggestions = (info: DatasetInfo | null, limit = 5): ColumnSuggestion[] => {
  if (!info || !info.rows) return [];

  const rowCount = Math.max(info.rows, 1);
  return getColumnEntries(info)
    .flatMap(({ column, stats }) => {
      const missingRatio = stats.missing / rowCount;
      if (stats.unique <= 1) {
        return [{ column, detail: 'Constant column' }];
      }

      if (missingRatio >= 0.6) {
        return [
          {
            column,
            detail: `${Math.round(missingRatio * 100)}% missing`,
          },
        ];
      }

      return [];
    })
    .slice(0, limit);
};

export const getUsefulColumns = (info: DatasetInfo | null, limit = 8): ColumnSuggestion[] =>
  getColumnEntries(info)
    .sort((a, b) => a.stats.missing - b.stats.missing || b.stats.unique - a.stats.unique)
    .map(({ column, stats, dtype }) => ({
      column,
      detail: `${dtype || 'unknown'}${stats.missing ? `, ${stats.missing} missing` : ''}`,
    }))
    .slice(0, limit);

export const getAutoDetectRecommendations = (
  recommendations: AutoDetectRecommendation[],
  operation: string
) =>
  recommendations
    .filter((item) => item.operation === operation)
    .sort((a, b) => {
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      return (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3);
    });

export const getRecommendationColumns = (recommendation: AutoDetectRecommendation) => {
  const columns: string[] = [];
  const { config } = recommendation;

  if (Array.isArray(config.columns)) {
    for (const value of config.columns) {
      if (typeof value === 'string' && value.trim()) {
        columns.push(value.trim());
      }
    }
  }

  if (typeof config.column === 'string' && config.column.trim()) {
    columns.push(config.column.trim());
  }

  return Array.from(new Set(columns));
};

export const getRecommendationDetail = (recommendation: AutoDetectRecommendation) => {
  const columns = getRecommendationColumns(recommendation);
  if (columns.length === 0) return recommendation.description;
  return `${columns.join(', ')}`;
};

export const getPrimaryRecommendationColumn = (recommendations: AutoDetectRecommendation[]) => {
  const first = recommendations[0];
  if (!first) return '';
  const columns = getRecommendationColumns(first);
  return columns[0] || '';
};

export const normalizeColumnName = normalizeName;
