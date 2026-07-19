import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Table, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { getPreview } from '../services/api';

interface DatasetPreviewPanelProps {
  sessionId: string | null;
  datasetName?: string | null;
  compact?: boolean;
  maxHeight?: string;
  refreshToken?: unknown;
}

export default function DatasetPreviewPanel({
  sessionId,
  datasetName,
  compact = false,
  maxHeight = '400px',
  refreshToken,
}: DatasetPreviewPanelProps) {
  const pageSize = compact ? 8 : 20;
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  const fetchPreview = useCallback(async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const res = await getPreview(sessionId, page, pageSize);
      setData(res.data || []);
      setColumns(res.columns || []);
      setTotalRows(res.total_rows || 0);
    } catch {
      // ignore preview errors
    } finally {
      setLoading(false);
    }
  }, [sessionId, page, pageSize, refreshToken]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  useEffect(() => {
    setPage(1);
    setHiddenCols(new Set());
    setShowColumnMenu(false);
  }, [sessionId, refreshToken]);

  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const visibleCols = columns.filter((col) => !hiddenCols.has(col));

  const toggleColumn = (column: string) => {
    setHiddenCols((current) => {
      const next = new Set(current);
      if (next.has(column)) {
        next.delete(column);
      } else {
        next.add(column);
      }
      return next;
    });
  };

  if (!sessionId) {
    return (
      <div className="glass-card p-6 text-center text-text-muted">
        <Table className="mx-auto mb-2 h-8 w-8 opacity-50" />
        <p className="text-sm">No dataset loaded</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className={`font-semibold uppercase tracking-[0.16em] text-text-muted ${compact ? 'text-[10px]' : 'text-xs'}`}>
            Dataset Preview
          </p>
          {datasetName && <p className={`mt-1 text-text ${compact ? 'text-xs' : 'text-sm'}`}>{datasetName}</p>}
        </div>

        <div className="flex items-center gap-3">
          <span className={`text-text-muted ${compact ? 'text-[10px]' : 'text-xs'}`}>
            {visibleCols.length}/{columns.length} columns
          </span>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColumnMenu((current) => !current)}
              className={`rounded-lg glass-button transition ${compact ? 'p-1.5' : 'p-2 text-xs'}`}
            >
              <Eye className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
            </button>

            {showColumnMenu && (
              <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl glass-panel border border-white/10 p-2 shadow-lg">
                <div className="max-h-60 overflow-y-auto">
                  {columns.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => toggleColumn(col)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition hover:bg-white/10"
                    >
                      {hiddenCols.has(col) ? (
                        <EyeOff className="h-3 w-3 text-text-muted" />
                      ) : (
                        <Eye className="h-3 w-3 text-primary" />
                      )}
                      <span className="truncate text-text">{col}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxHeight }} className="overflow-auto">
        {loading ? (
          <div className={`flex ${compact ? 'min-h-[140px]' : 'min-h-[200px]'} items-center justify-center text-text-muted`}>
            <div className={`animate-pulse ${compact ? 'text-xs' : 'text-sm'}`}>Loading...</div>
          </div>
        ) : (
          <table className={`min-w-full border-collapse ${compact ? 'text-[11px]' : 'text-xs'}`}>
            <thead className="sticky top-0 z-10 bg-white/5 backdrop-blur-sm">
              <tr>
                <th
                  className={`w-12 border-b border-white/10 text-left font-medium uppercase tracking-wider text-text-muted ${
                    compact ? 'px-2 py-1.5 text-[9px]' : 'px-3 py-2 text-[10px]'
                  }`}
                >
                  #
                </th>
                {visibleCols.map((col) => (
                  <th
                    key={col}
                    className={`border-b border-white/10 text-left font-medium uppercase tracking-wider text-text-muted ${
                      compact ? 'px-2 py-1.5 text-[9px]' : 'px-3 py-2 text-[10px]'
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleCols.length + 1}
                    className={`text-center text-text-muted ${compact ? 'px-3 py-6 text-xs' : 'px-3 py-8'}`}
                  >
                    No data available
                  </td>
                </tr>
              ) : (
                data.map((row, index) => (
                  <tr key={index} className="border-b border-white/5 transition hover:bg-white/5">
                    <td className={`text-text-muted ${compact ? 'px-2 py-1.5' : 'px-3 py-2'}`}>
                      {(page - 1) * pageSize + index + 1}
                    </td>
                    {visibleCols.map((col) => (
                      <td
                        key={col}
                        className={`max-w-[180px] text-text ${compact ? 'px-2 py-1.5' : 'px-3 py-2'}`}
                      >
                        <span className="block truncate">
                          {row[col] == null ? (
                            <span className="italic text-warning">null</span>
                          ) : (
                            String(row[col])
                          )}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-white/10 px-4 py-2">
        <span className={`text-text-muted ${compact ? 'text-[10px]' : 'text-xs'}`}>
          Page {page} of {totalPages} | {totalRows.toLocaleString()} rows
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1}
            className={`rounded-lg glass-button transition disabled:cursor-not-allowed disabled:opacity-40 ${
              compact ? 'p-1' : 'p-1.5'
            }`}
          >
            <ChevronLeft className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
          </button>

          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page >= totalPages}
            className={`rounded-lg glass-button transition disabled:cursor-not-allowed disabled:opacity-40 ${
              compact ? 'p-1' : 'p-1.5'
            }`}
          >
            <ChevronRight className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
