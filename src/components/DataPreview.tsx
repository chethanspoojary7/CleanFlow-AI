import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Filter, Search, Table, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getPreview } from '../services/api';

export default function DataPreview() {
  const { sessionId, datasetInfo, datasetName, refreshDatasetInfo } = useApp();
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);

  const fetchPreview = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await getPreview(sessionId, page, pageSize);
      setData(res.data || []);
      setColumns(res.columns || []);
      setTotalRows(res.total_rows || 0);
      await refreshDatasetInfo();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [sessionId, page, pageSize, refreshDatasetInfo]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  useEffect(() => {
    setPage(1);
    setSearchQuery('');
    setHiddenCols(new Set());
    setSortCol(null);
    setSortAsc(true);
    setColumnsMenuOpen(false);
  }, [sessionId]);

  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  const filteredData = searchQuery
    ? data.filter((row) =>
        Object.values(row).some((val) =>
          String(val).toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : data;

  const sortedData = sortCol
    ? [...filteredData].sort((a, b) => {
        const av = a[sortCol];
        const bv = b[sortCol];
        if (av === bv) return 0;
        if (av == null) return sortAsc ? 1 : -1;
        if (bv == null) return sortAsc ? -1 : 1;
        const cmp = String(av).localeCompare(String(bv));
        return sortAsc ? cmp : -cmp;
      })
    : filteredData;

  const visibleCols = columns.filter((column) => !hiddenCols.has(column));

  const toggleSort = (column: string) => {
    if (sortCol === column) {
      setSortAsc((current) => !current);
      return;
    }
    setSortCol(column);
    setSortAsc(true);
  };

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

  const resetView = () => {
    setSearchQuery('');
    setHiddenCols(new Set());
    setSortCol(null);
    setSortAsc(true);
    setPage(1);
    setColumnsMenuOpen(false);
  };

  if (!sessionId) {
    return (
      <div className="flex min-h-full items-center justify-center text-text-muted">
        <div className="text-center">
          <Table className="mx-auto mb-3 h-10 w-10 opacity-50" />
          <p>Upload a dataset to preview data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Data preview</p>
          <h2 className="mt-2 text-3xl font-semibold text-text">Inspect rows and columns</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted">
            Search values, hide columns, sort records, and review the dataset in a denser table layout.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Pill label="Dataset" value={datasetName || 'Loaded'} />
          <Pill label="Visible columns" value={String(visibleCols.length)} />
        </div>
      </motion.div>

      {datasetInfo && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Rows" value={datasetInfo.rows.toLocaleString()} />
          <MetricCard label="Columns" value={datasetInfo.columns.toString()} />
          <MetricCard label="Missing values" value={datasetInfo.missing_values.toString()} />
          <MetricCard label="Duplicate rows" value={datasetInfo.duplicate_rows.toString()} />
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-[280px] flex-1 items-center gap-3">
          <div className="glass-input flex min-w-0 flex-1 items-center gap-2 px-3 py-2">
            <Search className="h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search table..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full border-none bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
            />
          </div>

          <button
            type="button"
            onClick={resetView}
            className="rounded-xl glass-button px-4 py-2 text-sm font-medium transition"
          >
            Reset
          </button>
        </div>

        <div className="group relative">
          <button
            type="button"
            onClick={() => setColumnsMenuOpen((current) => !current)}
            className="inline-flex items-center gap-2 rounded-xl glass-button px-4 py-2 text-sm font-medium transition"
          >
            <Filter className="h-4 w-4" />
            Columns
          </button>

          <div
            className={`absolute right-0 top-full z-20 mt-2 w-56 rounded-2xl glass-panel border border-white/10 p-2 shadow-sm ${
              columnsMenuOpen ? 'block' : 'hidden'
            }`}
          >
            <div className="max-h-72 overflow-y-auto">
              {columns.map((column) => (
                <button
                  key={column}
                  type="button"
                  onClick={() => toggleColumn(column)}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-white/60 transition hover:bg-white/10 hover:text-white"
                >
                  {hiddenCols.has(column) ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                  <span className="truncate">{column}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-[24px] border border-white/10 glass-panel shadow-sm">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-white">Preview table</p>
            <p className="text-xs text-white/50">
              {sortedData.length} rows shown of {totalRows.toLocaleString()}
            </p>
          </div>
          <p className="text-xs text-white/50">{visibleCols.length} visible columns</p>
        </div>

        <div className="max-h-[58vh] overflow-auto">
          {loading ? (
            <div className="flex min-h-[220px] items-center justify-center text-white/40">
              <div className="animate-pulse">Loading...</div>
            </div>
          ) : (
            <table className="min-w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-white/5 backdrop-blur-sm">
                <tr>
                  <th className="w-14 border-b border-white/10 px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.16em] text-white/40">
                    #
                  </th>
                  {visibleCols.map((column) => (
                    <th
                      key={column}
                      onClick={() => toggleSort(column)}
                      className="cursor-pointer border-b border-white/10 px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.16em] text-white/50 transition hover:bg-white/5 hover:text-white"
                    >
                      <span className="inline-flex items-center gap-1">
                        {column}
                        {sortCol === column && <span className="text-primary">{sortAsc ? '↑' : '↓'}</span>}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedData.length === 0 ? (
                  <tr>
                    <td colSpan={visibleCols.length + 1} className="px-4 py-10 text-center text-white/40">
                      No rows match the current search.
                    </td>
                  </tr>
                ) : (
                  sortedData.map((row, index) => (
                    <tr key={index} className="border-b border-white/5 transition hover:bg-white/5">
                      <td className="px-4 py-3 text-xs text-white/30">
                        {(page - 1) * pageSize + index + 1}
                      </td>
                      {visibleCols.map((column) => (
                        <td
                          key={column}
                          className="max-w-[220px] px-4 py-3 text-sm text-white/80"
                        >
                          <span className="block truncate">
                            {row[column] == null ? (
                              <span className="italic text-warning">null</span>
                            ) : (
                              String(row[column])
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

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
          <span className="text-xs text-white/50">
            Page {page} of {totalPages}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              className="inline-flex items-center justify-center rounded-xl glass-button p-2 transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center justify-center rounded-xl glass-button p-2 transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-text">{value}</p>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 glass-panel px-3 py-1.5 text-xs text-white/50 shadow-sm">
      <span className="font-medium text-white">{label}</span>
      <span>{value}</span>
    </div>
  );
}
