export default function DashboardLoading() {
  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in w-full max-w-7xl mx-auto pb-6 sm:pb-8">
      {/* 1. Executive Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 sm:pb-5 border-b border-slate-200/90 dark:border-slate-800">
        <div className="space-y-1.5 min-w-0">
          <div className="skeleton h-6 sm:h-8 w-48 sm:w-72 rounded-xl" />
          <div className="skeleton h-3.5 sm:h-4 w-full max-w-xs sm:max-w-md rounded-md" />
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <div className="skeleton h-9 w-28 rounded-xl" />
          <div className="skeleton h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* 2. Top 4 Executive KPI Cards Skeleton (2-cols on mobile for compact density) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {[
          { label: "w-20", val: "w-28", pill: "w-16" },
          { label: "w-24", val: "w-24", pill: "w-20" },
          { label: "w-28", val: "w-20", pill: "w-16" },
          { label: "w-24", val: "w-28", pill: "w-20" },
        ].map((item, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 sm:p-5 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className={`skeleton h-3.5 ${item.label} rounded-md`} />
              <div className="skeleton w-8 h-8 sm:w-10 sm:h-10 rounded-xl shrink-0" />
            </div>
            <div className="space-y-1.5">
              <div className={`skeleton h-7 sm:h-8 ${item.val} rounded-lg`} />
              <div className="flex items-center justify-between pt-1">
                <div className="skeleton h-3 w-16 rounded-sm" />
                <div className={`skeleton h-4 ${item.pill} rounded-full`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Sales & Order Trend Chart Skeleton (Area Chart) */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1.5">
            <div className="skeleton h-5 w-48 sm:w-64 rounded-md" />
            <div className="skeleton h-3 w-40 sm:w-80 rounded-sm" />
          </div>
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <div className="skeleton h-8 w-20 rounded-xl" />
            <div className="skeleton h-8 w-20 rounded-xl" />
          </div>
        </div>

        {/* Simulated Line Chart Area */}
        <div className="relative w-full h-44 sm:h-64 rounded-xl overflow-hidden bg-slate-50/60 dark:bg-slate-950/40 p-3 sm:p-4 flex flex-col justify-between">
          {/* Subtle horizontal grid lines */}
          <div className="w-full space-y-8 sm:space-y-12 opacity-40">
            <div className="border-b border-dashed border-slate-300 dark:border-slate-700 w-full" />
            <div className="border-b border-dashed border-slate-300 dark:border-slate-700 w-full" />
            <div className="border-b border-dashed border-slate-300 dark:border-slate-700 w-full" />
          </div>

          {/* Shimmer wave simulation */}
          <div className="absolute inset-x-4 bottom-8 h-20 sm:h-32 skeleton rounded-t-2xl opacity-20" />

          {/* Month labels at bottom */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-800">
            {[1, 2, 3, 4, 5, 6].map((m) => (
              <div key={m} className="skeleton h-2.5 w-6 sm:w-10 rounded-sm" />
            ))}
          </div>
        </div>
      </div>

      {/* 4. Split District Sales & Order Status Breakdown Skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left: District Territory Sales Skeleton */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="skeleton h-5 w-40 rounded-md" />
            <div className="skeleton h-4 w-16 rounded-md" />
          </div>

          <div className="space-y-3.5">
            {[
              { w: "w-4/5", name: "w-20" },
              { w: "w-3/5", name: "w-24" },
              { w: "w-2/5", name: "w-16" },
              { w: "w-1/3", name: "w-20" },
            ].map((bar, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className={`skeleton h-3.5 ${bar.name} rounded-sm`} />
                  <div className="skeleton h-3 w-12 rounded-sm" />
                </div>
                <div className="w-full h-2 sm:h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className={`h-full ${bar.w} skeleton rounded-full`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Order Status Breakdown Skeleton */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="skeleton h-5 w-44 rounded-md" />
            <div className="skeleton h-4 w-20 rounded-md" />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
            {/* Circular Donut Skeleton */}
            <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full border-8 sm:border-[12px] border-slate-200/80 dark:border-slate-800 flex items-center justify-center shrink-0">
              <div className="skeleton h-4 w-12 rounded-sm" />
            </div>

            {/* Status Breakdown Legend Items */}
            <div className="space-y-2.5 w-full sm:w-auto">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center justify-between sm:justify-start gap-4">
                  <div className="flex items-center gap-2">
                    <div className="skeleton w-3 h-3 rounded-full shrink-0" />
                    <div className="skeleton h-3 w-20 rounded-sm" />
                  </div>
                  <div className="skeleton h-3 w-10 rounded-sm" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
