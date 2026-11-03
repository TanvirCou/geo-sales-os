export default function DashboardLoading() {
  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in w-full max-w-7xl mx-auto">
      {/* 1. Header Skeleton Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="space-y-2">
          <div className="skeleton h-7 sm:h-8 w-48 sm:w-64 rounded-xl" />
          <div className="skeleton h-4 w-72 sm:w-96 rounded-lg" />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="skeleton h-9 w-28 rounded-xl" />
          <div className="skeleton h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* 2. Top 4 Executive KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {[
          { labelWidth: "w-24", valWidth: "w-32", accent: "from-blue-500/10 to-transparent" },
          { labelWidth: "w-28", valWidth: "w-24", accent: "from-emerald-500/10 to-transparent" },
          { labelWidth: "w-20", valWidth: "w-28", accent: "from-amber-500/10 to-transparent" },
          { labelWidth: "w-32", valWidth: "w-20", accent: "from-purple-500/10 to-transparent" },
        ].map((item, idx) => (
          <div
            key={idx}
            className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${item.accent} rounded-full blur-2xl pointer-events-none`} />
            <div className="flex items-center justify-between">
              <div className="skeleton w-10 h-10 rounded-xl" />
              <div className="skeleton w-16 h-5 rounded-full" />
            </div>
            <div className="space-y-1.5">
              <div className={`skeleton h-7 ${item.valWidth} rounded-lg`} />
              <div className={`skeleton h-3.5 ${item.labelWidth} rounded-md`} />
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
              <div className="skeleton h-3 w-20 rounded-sm" />
              <div className="skeleton h-3 w-12 rounded-sm" />
            </div>
          </div>
        ))}
      </div>

      {/* 3. Main Split Section: Map/Analytics Skeleton & Recent Activity Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Geospatial Map / Chart Placeholder (2 Cols) */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="space-y-1.5">
              <div className="skeleton h-5 w-44 rounded-md" />
              <div className="skeleton h-3 w-60 rounded-sm" />
            </div>
            <div className="flex items-center gap-2">
              <div className="skeleton h-8 w-20 rounded-lg" />
              <div className="skeleton h-8 w-24 rounded-lg" />
            </div>
          </div>

          {/* Map canvas container simulation */}
          <div className="relative w-full h-80 sm:h-96 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-center">
            {/* Grid line effect */}
            <div
              className="absolute inset-0 opacity-15 dark:opacity-10"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
                backgroundSize: "24px 24px",
              }}
            />

            {/* Central radar pulsing indicator */}
            <div className="relative flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full border-2 border-blue-500/20 dark:border-blue-400/20 flex items-center justify-center radar-ping">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 dark:bg-blue-400/20" />
              </div>
              <div className="skeleton h-3.5 w-36 rounded-md" />
            </div>

            {/* Simulated pin skeletons scattered */}
            <div className="absolute top-1/4 left-1/4 skeleton w-5 h-5 rounded-full" />
            <div className="absolute top-1/3 right-1/3 skeleton w-5 h-5 rounded-full" />
            <div className="absolute bottom-1/4 left-1/2 skeleton w-5 h-5 rounded-full" />
          </div>

          {/* Bottom legend pills skeleton */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="skeleton h-4 w-28 rounded-md" />
            <div className="skeleton h-4 w-32 rounded-md" />
            <div className="skeleton h-4 w-24 rounded-md" />
          </div>
        </div>

        {/* Right: Recent Orders & Activity Stream Skeleton (1 Col) */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="skeleton h-5 w-36 rounded-md" />
            <div className="skeleton h-4 w-16 rounded-md" />
          </div>

          {/* List of 5 simulated order rows */}
          <div className="space-y-3.5">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/70 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="skeleton w-9 h-9 rounded-full shrink-0" />
                  <div className="space-y-1 min-w-0">
                    <div className="skeleton h-3.5 w-28 rounded-sm" />
                    <div className="skeleton h-3 w-20 rounded-sm" />
                  </div>
                </div>
                <div className="space-y-1 shrink-0 text-right">
                  <div className="skeleton h-3.5 w-16 rounded-sm ml-auto" />
                  <div className="skeleton h-4 w-12 rounded-full ml-auto" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
