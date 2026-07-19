import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Check,
  Database,
  FileSpreadsheet,
  Sparkles,
  Table2,
  Upload,
  Wand2,
} from 'lucide-react';

type LandingPageProps = {
  onEnter: () => void;
};

const workflowItems = [
  {
    icon: Upload,
    title: 'Import cleanly',
    text: 'Bring in CSV, Excel, JSON, or TSV files without visual clutter.',
  },
  {
    icon: Table2,
    title: 'Inspect quickly',
    text: 'Preview records, spot outliers, and compare columns in a clear layout.',
  },
  {
    icon: Wand2,
    title: 'Automate fixes',
    text: 'Apply cleaning and transformation steps with a workspace that stays readable.',
  },
];

export default function LandingPage({ onEnter }: LandingPageProps) {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 120, damping: 18, mass: 0.3 });
  const springY = useSpring(pointerY, { stiffness: 120, damping: 18, mass: 0.3 });

  const rotateY = useTransform(springX, [-0.5, 0.5], [-8, 8]);
  const rotateX = useTransform(springY, [-0.5, 0.5], [6, -6]);
  const leftShiftX = useTransform(springX, [-0.5, 0.5], [-14, 14]);
  const leftShiftY = useTransform(springY, [-0.5, 0.5], [-8, 8]);
  const rightShiftX = useTransform(springX, [-0.5, 0.5], [12, -12]);
  const rightShiftY = useTransform(springY, [-0.5, 0.5], [8, -8]);
  const tableShiftX = useTransform(springX, [-0.5, 0.5], [-8, 8]);
  const tableShiftY = useTransform(springY, [-0.5, 0.5], [-10, 10]);

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    pointerX.set(x);
    pointerY.set(y);
  };

  const resetPointer = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <div className="light-mode relative min-h-screen overflow-x-hidden text-text">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(180deg, rgba(255,255,255,0.94), rgba(255,255,255,0.62)), linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 48px 48px, 48px 48px',
        }}
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6 lg:px-8 lg:py-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text">CleanFlow AI</p>
              <p className="text-xs text-text-muted">Minimal data workspace</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onEnter}
            className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white px-4 py-2 text-sm font-medium text-text shadow-sm transition hover:border-primary/25 hover:text-primary"
          >
            Open workspace
            <ArrowRight className="h-4 w-4" />
          </button>
        </header>

        <main className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.02fr_0.98fr] lg:py-14">
          <section className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-text-muted shadow-sm">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Mouse-reactive landing experience
            </div>

            <div className="space-y-6">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-text sm:text-5xl lg:text-6xl">
                Clean data work, without visual noise.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-text-muted sm:text-lg">
                A focused workspace for uploading, reviewing, cleaning, and exporting
                datasets with a calmer layout and a more professional palette.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onEnter}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-primary/90"
              >
                Launch workspace
                <ArrowRight className="h-4 w-4" />
              </button>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-3 text-sm text-text-muted shadow-sm">
                <Check className="h-4 w-4 text-success" />
                Built for fast review
              </div>
            </div>

            <div className="grid gap-4 pt-4 sm:grid-cols-3">
              {workflowItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.title} className="border-t border-border pt-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-text">
                      <Icon className="h-4 w-4 text-primary" />
                      {item.title}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-text-muted">{item.text}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="relative">
            <motion.div
              ref={previewRef}
              onPointerMove={handlePointerMove}
              onPointerLeave={resetPointer}
              style={{
                rotateX,
                rotateY,
                transformStyle: 'preserve-3d',
              }}
              className="relative min-h-[520px] overflow-hidden rounded-[32px] border border-border bg-white shadow-[0_24px_80px_rgba(15,23,42,0.12)]"
            >
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    'linear-gradient(180deg, rgba(255,255,255,0.9), rgba(248,250,252,0.96)), linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)',
                  backgroundSize: '100% 100%, 44px 44px, 44px 44px',
                }}
              />

              <div className="relative flex h-full flex-col p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                      <Database className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text">Workspace Preview</p>
                      <p className="text-xs text-text-muted">Interactive data pipeline</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-emerald-700">
                      Live
                    </span>
                    <span className="rounded-full border border-border bg-slate-50 px-3 py-1 text-slate-600">
                      CleanFlow AI
                    </span>
                  </div>
                </div>

                <div className="grid flex-1 gap-4 pt-4 lg:grid-cols-[0.92fr_1.08fr]">
                  <div className="space-y-4">
                    <motion.div
                      style={{ x: leftShiftX, y: leftShiftY }}
                      className="rounded-[24px] border border-border bg-slate-50 p-4 shadow-sm"
                    >
                      <div className="flex items-center gap-2 text-sm font-medium text-text">
                        <Upload className="h-4 w-4 text-primary" />
                        Upload
                      </div>
                      <p className="mt-3 text-xs leading-6 text-text-muted">CSV, Excel, JSON, TSV</p>
                    </motion.div>

                    <motion.div
                      style={{ x: rightShiftX, y: rightShiftY }}
                      className="rounded-[24px] border border-border bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-center gap-2 text-sm font-medium text-text">
                        <Wand2 className="h-4 w-4 text-secondary" />
                        Cleanup
                      </div>
                      <p className="mt-3 text-xs leading-6 text-text-muted">
                        Missing values, duplicates, and transforms stay easy to inspect.
                      </p>
                    </motion.div>

                    <motion.div
                      style={{ x: tableShiftX, y: tableShiftY }}
                      className="rounded-[24px] border border-border bg-slate-50 p-4 shadow-sm"
                    >
                      <div className="flex items-center gap-2 text-sm font-medium text-text">
                        <BarChart3 className="h-4 w-4 text-accent" />
                        Summary
                      </div>
                      <p className="mt-3 text-xs leading-6 text-text-muted">
                        Clean output, compact charts, and a layout built for scanning.
                      </p>
                    </motion.div>
                  </div>

                  <motion.div
                    style={{ x: rightShiftX, y: leftShiftY }}
                    className="rounded-[28px] border border-border bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                        Preview table
                      </span>
                      <span className="text-xs text-text-muted">120 rows</span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {[
                        ['customer_id', 'status', 'score'],
                        ['1024', 'Ready', '98'],
                        ['1025', 'Review', '84'],
                        ['1026', 'Ready', '91'],
                      ].map((row, rowIndex) => (
                        <div
                          key={`${row[0]}-${rowIndex}`}
                          className={`grid grid-cols-3 gap-3 rounded-2xl border px-3 py-2 text-xs ${
                            rowIndex === 0
                              ? 'border-slate-200 bg-slate-50 font-medium text-slate-500'
                              : 'border-slate-200 bg-white text-slate-700'
                          }`}
                        >
                          {row.map((cell) => (
                            <span key={cell} className="truncate">
                              {cell}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 rounded-[22px] border border-border bg-slate-50 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-text">
                        <FileSpreadsheet className="h-4 w-4 text-primary" />
                        Data checks
                      </div>
                      <div className="mt-4 space-y-3">
                        {[
                          ['Missing values', '3 columns'],
                          ['Duplicate rows', '12 records'],
                          ['Export status', 'Ready'],
                        ].map(([label, value]) => (
                          <div key={label} className="flex items-center justify-between text-xs">
                            <span className="text-text-muted">{label}</span>
                            <span className="font-medium text-text">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-xs text-text-muted">
                  <span>Pointer-reactive frame</span>
                  <span>Minimal layout, clean palette</span>
                </div>
              </div>
            </motion.div>
          </section>
        </main>
      </div>
    </div>
  );
}
