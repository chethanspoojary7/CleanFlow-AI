export interface DatasetInfo {
  name: string;
  rows: number;
  columns: number;
  memory: string;
  missing_values: number;
  duplicate_rows: number;
  dtypes: Record<string, string>;
  column_stats: Record<string, { unique: number; missing: number; type: string }>;
}

export interface DataPreview {
  columns: string[];
  data: Record<string, unknown>[];
  total_rows: number;
  total_cols: number;
}

export interface CleaningOperation {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  pandas_code: string;
  affected_rows?: number;
}

export interface ColumnStat {
  column: string;
  dtype: string;
  unique: number;
  missing: number;
  missing_pct: number;
  mean?: number;
  median?: number;
  std?: number;
  min?: number;
  max?: number;
}

export interface HistoryState {
  id: string;
  timestamp: string;
  operation: string;
  description: string;
  pandas_code: string;
}

export interface AutoDetectRecommendation {
  id: string;
  category: 'cleaning' | 'transformation' | string;
  operation: string;
  priority: 'high' | 'medium' | 'low' | string;
  title: string;
  description: string;
  config: Record<string, unknown>;
  auto_applicable: boolean;
}

export interface AutoDetectResponse {
  recommendations: AutoDetectRecommendation[];
  total_count: number;
}
